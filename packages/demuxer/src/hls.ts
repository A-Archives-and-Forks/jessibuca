import { BaseDemuxer, DemuxEvent, DemuxMode, Source } from "./base";
import { annexbToAvcc, createAVCDecoderConfigurationRecord, extractParameterSets, adtsToAsc } from "./util";
import { Connection } from "jv4-connection/src/base";

// TS packet is always 188 bytes
const TS_PACKET_SIZE = 188;
const TS_SYNC_BYTE = 0x47;
const PAT_PID = 0x0000;

// PES constants
const PES_START_CODE_PREFIX = 0x000001;
const STREAM_ID_VIDEO_MIN = 0xE0;
const STREAM_ID_VIDEO_MAX = 0xEF;
const STREAM_ID_AUDIO_MIN = 0xC0;
const STREAM_ID_AUDIO_MAX = 0xDF;

interface TSPacketHeader {
  syncByte: number;
  transportError: boolean;
  payloadStart: boolean;
  transportPriority: boolean;
  pid: number;
  scramblingControl: number;
  adaptationFieldControl: number;
  continuityCounter: number;
}

interface ProgramInfo {
  programNumber: number;
  pmtPid: number;
}

interface PESPacket {
  streamId: number;
  pesPacketLength: number;
  pts?: number;
  dts?: number;
  payload: Uint8Array;
}

export class HLSDemuxer extends BaseDemuxer {
  private manifestURL: string;
  private segments: string[] = [];
  private currentSegment = 0;
  private m3u8Content?: string;
  private patTable: Map<number, { programNumber: number; pmtPid: number; }> = new Map();
  private pmtTable: Map<number, number> = new Map();
  private videoPid: number | null = null;
  private audioPid: number | null = null;
  private videoBuffer = new Uint8Array(0);
  private audioBuffer = new Uint8Array(0);
  private lastVideoPts = 0;
  private lastAudioPts = 0;
  private refreshInterval?: number;
  private isLive = true;
  private cachedSegments: Uint8Array[] = [];
  private currentTSOffset = 0;
  private isLoadingSegment = false;
  private videoDecoder: VideoDecoder;
  private audioDecoder: AudioDecoder;
  private videoQueue: EncodedVideoChunk[] = [];
  private audioQueue: EncodedAudioChunk[] = [];
  private currentVideoTimestamp: number = 0;
  private currentAudioTimestamp: number = 0;

  constructor(conn: Connection, mode: DemuxMode, videoDecoder: VideoDecoder, audioDecoder: AudioDecoder) {
    super(conn, mode);
    this.manifestURL = conn.url;
    this.videoDecoder = videoDecoder;
    this.audioDecoder = audioDecoder;
  }

  async initialize() {
    try {
      console.log('[HLSDemuxer] Initializing with mode:', this.mode);
      console.log('[HLSDemuxer] Manifest URL:', this.manifestURL);

      // First, always fetch and parse M3U8
      await this.fetchAndParseM3U8();

      if (this.isLive) {
        console.log('[HLSDemuxer] Setting up live stream refresh interval');
        this.refreshInterval = setInterval(async () => {
          console.log('[HLSDemuxer] Refreshing live stream manifest');
          await this.fetchAndParseM3U8();
        }, 3000) as unknown as number;
      }

      // Handle different modes
      if (this.mode === DemuxMode.PULL) {
        console.log('[HLSDemuxer] Preloading segments for pull mode');
        await this.preloadSegments();
      } else {
        console.log('[HLSDemuxer] Starting segment processing for push mode');
        await this.processNextSegment();
      }
    } catch (error) {
      console.error('[HLSDemuxer] Initialization error:', error);
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async fetchAndParseM3U8() {
    try {
      console.log('[HLSDemuxer] Fetching M3U8 from:', this.manifestURL);
      const response = await fetch(this.manifestURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const manifest = await response.text();
      console.log('[HLSDemuxer] Received M3U8 content:', manifest);
      this.parseManifest(manifest);

      // Start segment processing if not already started
      if (this.segments.length > 0 && this.currentSegment === 0) {
        console.log('[HLSDemuxer] Starting segment processing');
        this.processNextSegment();
      }
    } catch (error) {
      console.error('[HLSDemuxer] M3U8 fetch error:', error);
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private parseManifest(manifest: string) {
    console.log('[HLSDemuxer] Parsing manifest');
    const lines = manifest.split('\n');
    let newSegments: string[] = [];
    let duration = 0;
    let resolution: string | undefined;

    // Default to VOD if we see an ENDLIST tag
    this.isLive = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        duration = parseFloat(line.split(':')[1]);
      } else if (line.startsWith('#EXT-X-STREAM-INF:')) {
        // Parse stream info
        const attributes = line.substring(18).split(',');
        for (const attr of attributes) {
          if (attr.startsWith('RESOLUTION=')) {
            resolution = attr.split('=')[1];
          }
        }
      } else if (!line.startsWith('#') && line.length > 0) {
        try {
          // Handle both absolute and relative URLs
          let segmentUrl: string;
          if (line.startsWith('http://') || line.startsWith('https://')) {
            segmentUrl = line;
          } else {
            // Handle different relative path formats
            const baseUrl = new URL(this.manifestURL);
            const manifestPath = baseUrl.pathname.substring(0, baseUrl.pathname.lastIndexOf('/') + 1);
            const relativePath = line.replace(/\\/g, '/');
            segmentUrl = `${baseUrl.protocol}//${baseUrl.host}${manifestPath}${relativePath}`;
          }
          console.log('[HLSDemuxer] Adding segment:', {
            original: line,
            resolved: segmentUrl,
            duration,
            resolution
          });
          newSegments.push(segmentUrl);
        } catch (error) {
          console.error('[HLSDemuxer] Error parsing segment URL:', error);
        }
      } else if (line.includes('#EXT-X-ENDLIST')) {
        // If there's an ENDLIST tag, it's a VOD stream
        this.isLive = false;
      }
    }

    if (this.isLive) {
      console.log('[HLSDemuxer] Live stream detected');
      // Keep only new segments that weren't in the previous list
      const existingSegments = new Set(this.segments);
      newSegments = newSegments.filter(seg => !existingSegments.has(seg));
      this.segments.push(...newSegments);
    } else {
      console.log('[HLSDemuxer] VOD stream detected');
      this.segments = newSegments;
    }
    console.log('[HLSDemuxer] Total segments:', this.segments.length);
  }

  private async processNextSegment() {
    if (this.currentSegment >= this.segments.length) {
      console.log('[HLSDemuxer] Current segment exceeds available segments:', this.currentSegment, '/', this.segments.length);
      if (!this.isLive) {
        console.log('[HLSDemuxer] VOD stream finished');
        return;
      }
      console.log('[HLSDemuxer] Live stream waiting for new segments');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.fetchAndParseM3U8();
      return;
    }

    try {
      const segmentUrl = this.segments[this.currentSegment];
      console.log('[HLSDemuxer] Processing segment:', segmentUrl);

      // Add timeout and retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let response;

      while (retryCount < maxRetries) {
        try {
          response = await fetch(segmentUrl, {
            timeout: 5000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
            }
          });
          if (response.ok) break;
          console.warn('[HLSDemuxer] Segment fetch failed, status:', response.status, 'retry:', retryCount + 1);
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.warn('[HLSDemuxer] Segment fetch error:', error, 'retry:', retryCount + 1);
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP error! status: ${response?.status} for segment ${segmentUrl}`);
      }

      const data = await response.arrayBuffer();
      const tsData = new Uint8Array(data);
      console.log('[HLSDemuxer] Received TS data, size:', tsData.length, 'bytes for segment', this.currentSegment);

      // Reset PAT/PMT tables for each segment
      this.patTable.clear();
      this.pmtTable.clear();
      this.videoPid = null;
      this.audioPid = null;

      let offset = 0;
      let packetCount = 0;
      let invalidSyncBytes = 0;
      let lastSyncBytePosition = -1;

      // First pass: scan for sync bytes pattern and process PAT/PMT
      const syncPositions = [];
      while (offset < tsData.length - TS_PACKET_SIZE) {
        if (tsData[offset] === TS_SYNC_BYTE) {
          // Check if we have a pattern of sync bytes
          let isValidPattern = true;
          for (let i = 1; i < 5; i++) {
            if (offset + i * TS_PACKET_SIZE >= tsData.length ||
              tsData[offset + i * TS_PACKET_SIZE] !== TS_SYNC_BYTE) {
              isValidPattern = false;
              break;
            }
          }
          if (isValidPattern) {
            const packet = tsData.subarray(offset, offset + TS_PACKET_SIZE);
            const header = this.parseTSPacketHeader(packet);

            // First process PAT/PMT tables
            if (header.pid === PAT_PID) {
              console.log('[HLSDemuxer] Found PAT packet at offset:', offset);
              if (header.payloadStart) {
                this.parsePAT(packet.subarray(4));
              }
            } else {
              const patEntry = Array.from(this.patTable.entries()).find(([_, entry]) => entry.pmtPid === header.pid);
              if (patEntry) {
                console.log('[HLSDemuxer] Found PMT packet at offset:', offset);
                if (header.payloadStart) {
                  this.parsePMT(packet.subarray(4));
                }
              }
            }

            syncPositions.push(offset);
            lastSyncBytePosition = offset;
            offset += TS_PACKET_SIZE;
            continue;
          }
        }
        offset++;
      }

      console.log('[HLSDemuxer] Found', syncPositions.length, 'potential TS packets');
      console.log('[HLSDemuxer] PAT/PMT scan complete:', {
        patTableSize: this.patTable.size,
        pmtTableSize: this.pmtTable.size,
        videoPid: this.videoPid,
        audioPid: this.audioPid
      });

      // Second pass: process PES packets
      for (const position of syncPositions) {
        const packet = tsData.subarray(position, position + TS_PACKET_SIZE);
        const header = this.parseTSPacketHeader(packet);

        // Skip PAT/PMT packets as they were already processed
        if (header.pid === PAT_PID || Array.from(this.patTable.entries()).find(([_, entry]) => entry.pmtPid === header.pid)) {
          continue;
        }

        // Process PES packets
        const streamType = this.pmtTable.get(header.pid);
        if (streamType) {
          let payloadOffset = 4;
          if (header.adaptationFieldControl & 0x02) {
            const adaptationFieldLength = packet[payloadOffset];
            payloadOffset += 1 + adaptationFieldLength;
          }

          if (header.adaptationFieldControl & 0x01) {
            this.handlePESPacket(header.pid, packet.subarray(payloadOffset));
          }
        }
        packetCount++;
      }

      console.log('[HLSDemuxer] Processed segment', this.currentSegment, ':', {
        totalPackets: packetCount,
        invalidSyncBytes,
        segmentSize: tsData.length,
        remainingSegments: this.segments.length - this.currentSegment - 1
      });

      this.currentSegment++;
      this.processNextSegment();
    } catch (error) {
      console.error('[HLSDemuxer] Segment processing error:', error);
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));

      // For live streams, try to recover by fetching new manifest
      if (this.isLive) {
        console.log('[HLSDemuxer] Live stream - attempting to recover by refreshing manifest');
        await this.fetchAndParseM3U8();
      }

      // Retry after delay
      setTimeout(() => this.processNextSegment(), 1000);
    }
  }

  private parseTSPacketHeader(data: Uint8Array): TSPacketHeader {
    // Validate sync byte
    if (data[0] !== TS_SYNC_BYTE) {
      console.warn('[HLSDemuxer] Invalid sync byte:', data[0].toString(16));
    }

    // Extract PID with detailed logging
    const pid = ((data[1] & 0x1f) << 8) | data[2];
    const rawPidBytes = [data[1], data[2]];

    console.log('[HLSDemuxer] Parsing TS packet header:', {
      syncByte: data[0].toString(16),
      rawPidBytes: rawPidBytes.map(b => b.toString(16).padStart(2, '0')).join(' '),
      calculatedPid: pid,
      transportError: !!(data[1] & 0x80),
      payloadStart: !!(data[1] & 0x40),
      rawHeaderBytes: Array.from(data.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    return {
      syncByte: data[0],
      transportError: !!(data[1] & 0x80),
      payloadStart: !!(data[1] & 0x40),
      transportPriority: !!(data[1] & 0x20),
      pid: pid,
      scramblingControl: (data[3] & 0xc0) >> 6,
      adaptationFieldControl: (data[3] & 0x30) >> 4,
      continuityCounter: data[3] & 0x0f
    };
  }

  private parseTSPacket(data: Uint8Array, offset: number): number {
    const header = this.parseTSPacketHeader(data);
    if (!header) {
      return -1;
    }

    // Calculate adaptation field length
    let adaptationFieldLength = 0;
    if (header.adaptationFieldControl & 0x02) { // Check if adaptation field is present
      adaptationFieldLength = data[offset + 4] + 1; // +1 for length byte itself
    }

    // First pass: scan for PAT/PMT tables
    if (header.pid === PAT_PID) {
      console.log('[HLSDemuxer] Found PAT packet:', {
        offset,
        payloadStart: header.payloadStart,
        adaptationFieldControl: header.adaptationFieldControl,
        adaptationFieldLength,
        rawBytes: Array.from(data.slice(offset, offset + 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      if (header.payloadStart) {
        const patOffset = offset + 4 + adaptationFieldLength;
        const patResult = this.parsePAT(data, patOffset);
        if (patResult) {
          console.log('[HLSDemuxer] PAT parsed successfully:', patResult);
        }
      }
    } else if (this.pmtTable.has(header.pid)) {
      console.log('[HLSDemuxer] Found PMT packet:', {
        offset,
        payloadStart: header.payloadStart,
        adaptationFieldControl: header.adaptationFieldControl,
        adaptationFieldLength,
        rawBytes: Array.from(data.slice(offset, offset + 4)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      if (header.payloadStart) {
        const pmtOffset = offset + 4 + adaptationFieldLength;
        const pmtResult = this.parsePMT(data, pmtOffset);
        if (pmtResult) {
          console.log('[HLSDemuxer] PMT parsed successfully:', pmtResult);
        }
      }
    }

    // Second pass: handle PES packets
    if (this.videoPid !== null && header.pid === this.videoPid) {
      // Handle video PES packet
      if (header.payloadStart) {
        const pesOffset = offset + 4 + adaptationFieldLength;
        this.handlePESPacket(header.pid, data.subarray(pesOffset));
      }
    } else if (this.audioPid !== null && header.pid === this.audioPid) {
      // Handle audio PES packet
      if (header.payloadStart) {
        const pesOffset = offset + 4 + adaptationFieldLength;
        this.handlePESPacket(header.pid, data.subarray(pesOffset));
      }
    }

    return offset + TS_PACKET_SIZE;
  }

  private parsePAT(data: Uint8Array, offset: number): boolean {
    console.log('[HLSDemuxer] Starting PAT parsing at offset:', offset, 'data length:', data.length);

    // Check if we have enough data
    if (offset >= data.length) {
      console.warn('[HLSDemuxer] PAT parse error: offset out of bounds');
      return false;
    }

    // Skip pointer field
    const pointerField = data[offset];
    console.log('[HLSDemuxer] PAT pointer field:', pointerField);
    offset += 1 + pointerField;

    // Check if we have enough data after pointer field
    if (offset + 3 >= data.length) {
      console.warn('[HLSDemuxer] PAT parse error: not enough data after pointer field');
      return false;
    }

    // Parse PAT header
    const tableId = data[offset];
    if (tableId !== 0x00) {
      console.log('[HLSDemuxer] Invalid PAT table ID:', {
        tableId: tableId.toString(16),
        offset,
        rawBytes: Array.from(data.slice(offset, Math.min(offset + 3, data.length)))
          .map(b => b.toString(16).padStart(2, '0')).join(' ')
      });
      return false;
    }

    const sectionLength = ((data[offset + 1] & 0x0F) << 8) | data[offset + 2];
    console.log('[HLSDemuxer] PAT section:', {
      tableId: tableId.toString(16),
      sectionLength,
      offset,
      rawBytes: Array.from(data.slice(offset, Math.min(offset + 8, data.length)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // Check if we have enough data for the complete section
    if (offset + 8 + sectionLength > data.length) {
      console.warn('[HLSDemuxer] PAT parse error: section length exceeds available data');
      return false;
    }

    // Skip to program info
    offset += 8;

    // Parse program info
    const programNumber = (data[offset] << 8) | data[offset + 1];
    const pmtPid = ((data[offset + 2] & 0x1F) << 8) | data[offset + 3];

    console.log('[HLSDemuxer] PAT program info:', {
      programNumber,
      pmtPid,
      rawBytes: Array.from(data.slice(offset, Math.min(offset + 4, data.length)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    this.patTable.set(programNumber, { programNumber, pmtPid });
    this.pmtTable.set(pmtPid, 0x1B); // Assuming H.264 video stream

    console.log('[HLSDemuxer] PAT parsing complete:', {
      programNumber,
      pmtPid,
      patTableSize: this.patTable.size,
      pmtTableSize: this.pmtTable.size
    });

    return true;
  }

  private parsePMT(data: Uint8Array, offset: number): boolean {
    console.log('[HLSDemuxer] Starting PMT parsing at offset:', offset, 'data length:', data.length);

    // Check if we have enough data
    if (offset >= data.length) {
      console.warn('[HLSDemuxer] PMT parse error: offset out of bounds');
      return false;
    }

    // Skip pointer field
    const pointerField = data[offset];
    console.log('[HLSDemuxer] PMT pointer field:', pointerField);
    offset += 1 + pointerField;

    // Check if we have enough data after pointer field
    if (offset + 3 >= data.length) {
      console.warn('[HLSDemuxer] PMT parse error: not enough data after pointer field');
      return false;
    }

    // Parse PMT header
    const tableId = data[offset];
    if (tableId !== 0x02) {
      console.log('[HLSDemuxer] Invalid PMT table ID:', {
        tableId: tableId.toString(16),
        offset,
        rawBytes: Array.from(data.slice(offset, Math.min(offset + 3, data.length)))
          .map(b => b.toString(16).padStart(2, '0')).join(' ')
      });
      return false;
    }

    const sectionLength = ((data[offset + 1] & 0x0F) << 8) | data[offset + 2];
    console.log('[HLSDemuxer] PMT section:', {
      tableId: tableId.toString(16),
      sectionLength,
      offset,
      rawBytes: Array.from(data.slice(offset, Math.min(offset + 8, data.length)))
        .map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    // Check if we have enough data for the complete section
    if (offset + 8 + sectionLength > data.length) {
      console.warn('[HLSDemuxer] PMT parse error: section length exceeds available data');
      return false;
    }

    // Skip to program info length
    offset += 12;
    const programInfoLength = ((data[offset] & 0x0F) << 8) | data[offset + 1];
    console.log('[HLSDemuxer] PMT program info length:', programInfoLength);

    // Skip program info
    offset += 2 + programInfoLength;

    // Parse stream entries
    while (offset < data.length - 4) {
      const streamType = data[offset];
      const elementaryPID = ((data[offset + 1] & 0x1F) << 8) | data[offset + 2];
      const esInfoLength = ((data[offset + 3] & 0x0F) << 8) | data[offset + 4];

      console.log('[HLSDemuxer] PMT stream entry:', {
        streamType: streamType.toString(16),
        elementaryPID,
        esInfoLength,
        rawBytes: Array.from(data.slice(offset, Math.min(offset + 5, data.length)))
          .map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      // Check stream type and set video/audio PIDs
      if (streamType === 0x1B) { // H.264 video
        this.videoPid = elementaryPID;
        console.log('[HLSDemuxer] Found video stream:', { pid: elementaryPID, type: 'H.264' });
      } else if (streamType === 0x0F) { // AAC audio
        this.audioPid = elementaryPID;
        console.log('[HLSDemuxer] Found audio stream:', { pid: elementaryPID, type: 'AAC' });
      }

      offset += 5 + esInfoLength;
    }

    console.log('[HLSDemuxer] PMT parsing complete:', {
      videoPid: this.videoPid,
      audioPid: this.audioPid
    });

    return true;
  }

  private parsePESHeader(data: Uint8Array): PESPacket | null {
    // Check PES start code prefix
    const prefix = (data[0] << 16) | (data[1] << 8) | data[2];
    console.log('[HLSDemuxer] Checking PES header:', {
      dataLength: data.length,
      prefix: prefix.toString(16),
      expectedPrefix: PES_START_CODE_PREFIX.toString(16),
      firstBytes: Array.from(data.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    if (prefix !== PES_START_CODE_PREFIX) {
      console.warn('[HLSDemuxer] Invalid PES prefix');
      return null;
    }

    const streamId = data[3];
    const pesPacketLength = (data[4] << 8) | data[5];
    const pesHeaderFlags = data[7];
    const ptsDtsFlags = (pesHeaderFlags >> 6) & 0x03;
    const pesHeaderLength = data[8];

    console.log('[HLSDemuxer] PES header details:', {
      streamId: streamId.toString(16),
      pesPacketLength,
      pesHeaderFlags: pesHeaderFlags.toString(16),
      ptsDtsFlags,
      pesHeaderLength,
      isVideo: streamId >= STREAM_ID_VIDEO_MIN && streamId <= STREAM_ID_VIDEO_MAX,
      isAudio: streamId >= STREAM_ID_AUDIO_MIN && streamId <= STREAM_ID_AUDIO_MAX
    });

    let pts: number | undefined;
    let dts: number | undefined;
    let payloadStart = 9 + pesHeaderLength;

    // Parse PTS/DTS
    if (ptsDtsFlags === 2 || ptsDtsFlags === 3) {
      if (data.length < 14) {
        console.warn('[HLSDemuxer] PES packet too short for PTS');
        return null;
      }
      pts = this.parseTimestamp(data.subarray(9));
      if (ptsDtsFlags === 3) {
        if (data.length < 19) {
          console.warn('[HLSDemuxer] PES packet too short for DTS');
          return null;
        }
        dts = this.parseTimestamp(data.subarray(14));
      } else {
        dts = pts;
      }
      console.log('[HLSDemuxer] PES timing:', {
        pts: pts ? Math.round(pts / 90) : undefined,
        dts: dts ? Math.round(dts / 90) : undefined
      });
    }

    if (payloadStart >= data.length) {
      console.warn('[HLSDemuxer] No payload data in PES packet');
      return null;
    }

    const payload = data.subarray(payloadStart);
    console.log('[HLSDemuxer] PES payload:', {
      payloadStart,
      payloadLength: payload.length,
      firstPayloadBytes: Array.from(payload.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    });

    return {
      streamId,
      pesPacketLength,
      pts,
      dts,
      payload
    };
  }

  private parseTimestamp(data: Uint8Array): number {
    if (data.length < 5) {
      throw new Error('Timestamp data too short');
    }

    const byte1 = data[0];
    const byte2 = data[1];
    const byte3 = data[2];
    const byte4 = data[3];
    const byte5 = data[4];

    // Validate marker bits
    if (((byte1 & 0x01) !== 0x01) || ((byte3 & 0x01) !== 0x01) || ((byte5 & 0x01) !== 0x01)) {
      console.warn('[HLSDemuxer] Invalid timestamp marker bits:', {
        byte1: byte1.toString(16),
        byte3: byte3.toString(16),
        byte5: byte5.toString(16)
      });
    }

    return ((byte1 & 0x0E) * 536870912 + // 1 << 29
      (byte2 & 0xFF) * 4194304 + // 1 << 22
      (byte3 & 0xFE) * 16384 + // 1 << 14
      (byte4 & 0xFF) * 128 + // 1 << 7
      (byte5 & 0xFE) / 2);
  }

  private handlePESPacket(pid: number, data: Uint8Array): void {
    const pesPacket = this.parsePESHeader(data);
    if (!pesPacket) {
      console.warn('[HLSDemuxer] Failed to parse PES header');
      return;
    }

    const { streamId, pts, dts, payload } = pesPacket;
    const streamType = this.pmtTable.get(pid);

    // Handle video PES packet
    if (pid === this.videoPid && streamId >= STREAM_ID_VIDEO_MIN && streamId <= STREAM_ID_VIDEO_MAX) {
      if (!streamType) {
        console.warn('[HLSDemuxer] No stream type found for video PID:', pid);
        return;
      }

      const isKeyframe = this.isKeyframe(payload, streamType);
      console.log('[HLSDemuxer] Processing video PES packet:', {
        pid,
        streamId,
        pts: pts ? Math.round(pts / 90) : undefined,
        dts: dts ? Math.round(dts / 90) : undefined,
        isKeyframe,
        payloadSize: payload.length,
        streamType
      });

      // For keyframes, try to extract SPS/PPS
      if (isKeyframe) {
        const isHevc = streamType === 0x24;
        const paramSets = extractParameterSets(payload, isHevc);

        if (paramSets.sps.length > 0 && paramSets.pps.length > 0) {
          if (!isHevc) { // H.264
            const description = createAVCDecoderConfigurationRecord(
              paramSets.sps[0],
              paramSets.pps[0]
            );
            if (description) {
              this.videoDecoderConfig = {
                codec: "avc",
                description
              };
              console.log('[HLSDemuxer] Emitting video encoder config change');
              this.emit(DemuxEvent.VIDEO_ENCODER_CONFIG_CHANGED, this.videoDecoderConfig);
            }
          }
        }
      }

      // Always call gotVideo with the frame data
      if (this.gotVideo) {
        const timestamp = pts ? Math.round(pts / 90) : this.lastVideoPts;
        const duration = pts && this.lastVideoPts ? timestamp - this.lastVideoPts : 0;

        console.log('[HLSDemuxer] Calling gotVideo with frame:', {
          type: isKeyframe ? "key" : "delta",
          timestamp,
          duration,
          size: payload.length
        });

        this.gotVideo({
          type: isKeyframe ? "key" : "delta",
          data: this.format === 'avcc' ? annexbToAvcc(payload) : payload,
          timestamp,
          duration
        });

        if (pts) this.lastVideoPts = timestamp;
      }
    }
    // Handle audio PES packet
    else if (pid === this.audioPid && streamId >= STREAM_ID_AUDIO_MIN && streamId <= STREAM_ID_AUDIO_MAX) {
      // For AAC, we need to handle ADTS frames
      if (this.audioDecoderConfig?.codec === 'aac') {
        // Look for ADTS sync word
        let offset = 0;
        while (offset < payload.length - 1) {
          if (payload[offset] === 0xFF && (payload[offset + 1] & 0xF0) === 0xF0) {
            // Found ADTS frame
            if (offset + 7 > payload.length) {
              console.warn('[HLSDemuxer] ADTS header truncated');
              break;
            }

            const frameLength = ((payload[offset + 3] & 0x03) << 11) |
              (payload[offset + 4] << 3) |
              ((payload[offset + 5] & 0xE0) >> 5);

            if (offset + frameLength > payload.length) {
              console.warn('[HLSDemuxer] ADTS frame truncated');
              break;
            }

            // Update audio config if needed
            if (!this.audioDecoderConfig.description) {
              const config = adtsToAsc(payload.subarray(offset));
              if (config) {
                this.audioDecoderConfig = {
                  codec: 'aac',
                  numberOfChannels: config.channel,
                  sampleRate: config.sampleRate,
                  description: config.audioSpecificConfig
                };
                console.log('[HLSDemuxer] Emitting audio encoder config change');
                this.emit(DemuxEvent.AUDIO_ENCODER_CONFIG_CHANGED, this.audioDecoderConfig);
              }
            }

            // Extract raw AAC frame (skip ADTS header)
            const frame = payload.subarray(offset + 7, offset + frameLength);
            const timestamp = pts ? Math.round(pts / 90) : this.lastAudioPts;
            const duration = pts && this.lastAudioPts ? timestamp - this.lastAudioPts : 0;

            console.log('[HLSDemuxer] Found AAC frame:', {
              offset,
              frameLength,
              timestamp,
              duration
            });

            this.gotAudio?.({
              type: "key",
              data: frame,
              timestamp,
              duration
            });

            if (pts) this.lastAudioPts = timestamp;
            offset += frameLength;
          } else {
            offset++;
          }
        }
      } else {
        const timestamp = pts ? Math.round(pts / 90) : this.lastAudioPts;
        const duration = pts && this.lastAudioPts ? timestamp - this.lastAudioPts : 0;

        this.gotAudio?.({
          type: "key",
          data: payload,
          timestamp,
          duration
        });

        if (pts) this.lastAudioPts = timestamp;
      }
    }
  }

  private isKeyframe(data: Uint8Array, streamType?: number): boolean {
    if (!streamType) return false;

    // H.264
    if (streamType === 0x1b) {
      // Look for IDR NAL unit type
      let offset = 0;
      while (offset < data.length - 4) {
        if (data[offset] === 0 && data[offset + 1] === 0 && data[offset + 2] === 1) {
          const nalType = data[offset + 3] & 0x1F;
          return nalType === 5; // IDR picture
        }
        offset++;
      }
    }
    // H.265
    else if (streamType === 0x24) {
      let offset = 0;
      while (offset < data.length - 4) {
        if (data[offset] === 0 && data[offset + 1] === 0 && data[offset + 2] === 1) {
          const nalType = (data[offset + 3] >> 1) & 0x3F;
          return nalType >= 16 && nalType <= 21; // IRAP picture
        }
        offset++;
      }
    }

    return false;
  }

  private async preloadSegments() {
    try {
      console.log('[HLSDemuxer] Preloading segments');
      // Load first two segments
      for (let i = 0; i < Math.min(2, this.segments.length); i++) {
        console.log('[HLSDemuxer] Loading segment:', this.segments[i]);
        const response = await fetch(this.segments[i]);
        const data = await response.arrayBuffer();
        this.cachedSegments.push(new Uint8Array(data));
      }
      this.currentSegment = 2; // Next segment to load
      console.log('[HLSDemuxer] Preloaded segments:', this.cachedSegments.length);
    } catch (error) {
      console.error('[HLSDemuxer] Error preloading segments:', error);
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadNextSegment() {
    if (this.isLoadingSegment || this.currentSegment >= this.segments.length) {
      console.log('[HLSDemuxer] Skip loading next segment - already loading or no more segments');
      return;
    }

    try {
      this.isLoadingSegment = true;
      console.log('[HLSDemuxer] Loading next segment:', this.segments[this.currentSegment]);
      const response = await fetch(this.segments[this.currentSegment]);
      const data = await response.arrayBuffer();
      this.cachedSegments.push(new Uint8Array(data));
      this.currentSegment++;
      this.isLoadingSegment = false;
      console.log('[HLSDemuxer] Successfully loaded next segment');
    } catch (error) {
      console.error('[HLSDemuxer] Error loading next segment:', error);
      this.isLoadingSegment = false;
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async pull(): Promise<void> {
    try {
      // First time: read M3U8 from source
      if (this.segments.length === 0) {
        console.log('[HLSDemuxer] First pull, reading M3U8 from source');
        await this.fetchAndParseM3U8();
        return;
      }

      // If no segments available, try to get more for live streams
      if (this.cachedSegments.length === 0) {
        if (this.currentSegment >= this.segments.length) {
          if (!this.isLive) {
            console.log('[HLSDemuxer] VOD stream ended');
            this.emit(DemuxEvent.DEMUX_ERROR, new Error('End of stream'));
            return;
          }
          await this.fetchAndParseM3U8();
          return;
        }

        console.log('[HLSDemuxer] Loading next segment:', this.segments[this.currentSegment]);
        const response = await fetch(this.segments[this.currentSegment], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.arrayBuffer();
        console.log('[HLSDemuxer] Loaded segment data:', {
          segmentIndex: this.currentSegment,
          segmentUrl: this.segments[this.currentSegment],
          dataSize: data.byteLength,
          firstBytes: Array.from(new Uint8Array(data).slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        });
        this.cachedSegments.push(new Uint8Array(data));
        this.currentSegment++;
        return;
      }

      // Process one TS packet
      const currentTS = this.cachedSegments[0];
      if (!currentTS) {
        console.log('[HLSDemuxer] No TS data available');
        return;
      }

      console.log('[HLSDemuxer] Processing TS data:', {
        offset: this.currentTSOffset,
        totalLength: currentTS.length,
        remainingBytes: currentTS.length - this.currentTSOffset,
        nextBytes: Array.from(currentTS.slice(this.currentTSOffset, this.currentTSOffset + 8)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      // Look for sync byte
      let syncByteFound = false;
      while (this.currentTSOffset < currentTS.length - TS_PACKET_SIZE) {
        if (currentTS[this.currentTSOffset] === TS_SYNC_BYTE) {
          // Verify sync byte pattern
          let isValidPattern = true;
          for (let i = 1; i < 5; i++) {
            if (this.currentTSOffset + i * TS_PACKET_SIZE >= currentTS.length ||
              currentTS[this.currentTSOffset + i * TS_PACKET_SIZE] !== TS_SYNC_BYTE) {
              isValidPattern = false;
              break;
            }
          }
          if (isValidPattern) {
            syncByteFound = true;
            break;
          }
        }
        this.currentTSOffset++;
      }

      if (!syncByteFound) {
        console.warn('[HLSDemuxer] No valid sync byte pattern found in current segment');
        this.cachedSegments.shift();
        this.currentTSOffset = 0;
        return;
      }

      // Process packets until we run out of data or hit an error
      while (this.currentTSOffset + TS_PACKET_SIZE <= currentTS.length) {
        const packet = currentTS.subarray(this.currentTSOffset, this.currentTSOffset + TS_PACKET_SIZE);
        if (packet[0] !== TS_SYNC_BYTE) {
          console.warn('[HLSDemuxer] Lost sync at offset:', this.currentTSOffset);
          break;
        }

        await this.parseTSPacket(packet);
        this.currentTSOffset += TS_PACKET_SIZE;
      }

      // If we've processed all data in the current segment
      if (this.currentTSOffset >= currentTS.length) {
        console.log('[HLSDemuxer] Finished processing segment');
        this.cachedSegments.shift();
        this.currentTSOffset = 0;

        // Load next segment if available
        if (this.currentSegment < this.segments.length) {
          console.log('[HLSDemuxer] Loading next segment:', this.segments[this.currentSegment]);
          const response = await fetch(this.segments[this.currentSegment], {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
            }
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.arrayBuffer();
          console.log('[HLSDemuxer] Loaded next segment, size:', data.byteLength);
          this.cachedSegments.push(new Uint8Array(data));
          this.currentSegment++;
        }
      }
    } catch (error) {
      console.error('[HLSDemuxer] Error in pull:', error);
      this.emit(DemuxEvent.DEMUX_ERROR, error instanceof Error ? error : new Error(String(error)));
    }
  }

  *demux(): Generator<number | Uint8Array, void, Uint8Array> {
    // In HLS, we don't use generator mode since we're using pull mode
    return;
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    this.segments = [];
    this.currentSegment = 0;
  }

  private async parsePES(data: Uint8Array, isVideo: boolean, isStart: boolean): Promise<void> {
    try {
      // Process any existing buffer before starting new one
      if (isVideo && this.videoBuffer.length > 0) {
        console.log('[HLSDemuxer] Processing existing video buffer before new PES packet:', {
          bufferSize: this.videoBuffer.length,
          hasStartCode: this.videoBuffer.length >= 3 &&
            ((this.videoBuffer[0] << 16) | (this.videoBuffer[1] << 8) | this.videoBuffer[2]) === PES_START_CODE_PREFIX
        });
        this.handlePESPacket(this.videoPid!, this.videoBuffer);
        this.videoBuffer = new Uint8Array(0);
      } else if (!isVideo && this.audioBuffer.length > 0) {
        console.log('[HLSDemuxer] Processing existing audio buffer before new PES packet:', {
          bufferSize: this.audioBuffer.length,
          hasStartCode: this.audioBuffer.length >= 3 &&
            ((this.audioBuffer[0] << 16) | (this.audioBuffer[1] << 8) | this.audioBuffer[2]) === PES_START_CODE_PREFIX
        });
        this.handlePESPacket(this.audioPid!, this.audioBuffer);
        this.audioBuffer = new Uint8Array(0);
      }

      // Start new buffer or append to existing
      if (isStart) {
        if (isVideo) {
          console.log('[HLSDemuxer] Starting new video PES packet:', {
            dataSize: data.length,
            hasStartCode: data.length >= 3 &&
              ((data[0] << 16) | (data[1] << 8) | data[2]) === PES_START_CODE_PREFIX
          });
          this.videoBuffer = data;
        } else {
          console.log('[HLSDemuxer] Starting new audio PES packet:', {
            dataSize: data.length,
            hasStartCode: data.length >= 3 &&
              ((data[0] << 16) | (data[1] << 8) | data[2]) === PES_START_CODE_PREFIX
          });
          this.audioBuffer = data;
        }
      } else {
        // Append to existing buffer
        if (isVideo) {
          const newBuffer = new Uint8Array(this.videoBuffer.length + data.length);
          newBuffer.set(this.videoBuffer);
          newBuffer.set(data, this.videoBuffer.length);
          this.videoBuffer = newBuffer;
          console.log('[HLSDemuxer] Appended to video buffer:', {
            existingSize: this.videoBuffer.length,
            appendedSize: data.length,
            totalSize: newBuffer.length
          });
        } else {
          const newBuffer = new Uint8Array(this.audioBuffer.length + data.length);
          newBuffer.set(this.audioBuffer);
          newBuffer.set(data, this.audioBuffer.length);
          this.audioBuffer = newBuffer;
          console.log('[HLSDemuxer] Appended to audio buffer:', {
            existingSize: this.audioBuffer.length,
            appendedSize: data.length,
            totalSize: newBuffer.length
          });
        }
      }

      // Try to process complete PES packets
      if (isVideo && this.videoBuffer.length >= 6) {
        const prefix = (this.videoBuffer[0] << 16) | (this.videoBuffer[1] << 8) | this.videoBuffer[2];
        if (prefix === PES_START_CODE_PREFIX) {
          const pesLength = (this.videoBuffer[4] << 8) | this.videoBuffer[5];
          console.log('[HLSDemuxer] Found complete video PES packet:', {
            bufferSize: this.videoBuffer.length,
            pesLength: pesLength === 0 ? 'unknown' : pesLength
          });
          if (pesLength === 0 || this.videoBuffer.length >= pesLength + 6) {
            this.handlePESPacket(this.videoPid!, this.videoBuffer);
            this.videoBuffer = new Uint8Array(0);
          }
        }
      } else if (!isVideo && this.audioBuffer.length >= 6) {
        const prefix = (this.audioBuffer[0] << 16) | (this.audioBuffer[1] << 8) | this.audioBuffer[2];
        if (prefix === PES_START_CODE_PREFIX) {
          const pesLength = (this.audioBuffer[4] << 8) | this.audioBuffer[5];
          console.log('[HLSDemuxer] Found complete audio PES packet:', {
            bufferSize: this.audioBuffer.length,
            pesLength: pesLength === 0 ? 'unknown' : pesLength
          });
          if (pesLength === 0 || this.audioBuffer.length >= pesLength + 6) {
            this.handlePESPacket(this.audioPid!, this.audioBuffer);
            this.audioBuffer = new Uint8Array(0);
          }
        }
      }
    } catch (error) {
      console.error('[HLSDemuxer] Error in parsePES:', error);
      // Don't throw here to allow processing to continue
    }
  }
} 