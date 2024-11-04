import MP4, { MP4Meta } from "./fmp4";
import { avcEncoderConfigurationRecord } from "./h264";
import SPSParser from "./h264-sps-parser";
import {
  VideoDecoderInterface,
  VideoDecoderEvent,
} from "./types";
import { ChangeState, FSM, Includes } from "afsm";
export class VideoDecoderMSE extends FSM implements VideoDecoderInterface {
  sourceBuffer?: SourceBuffer;
  sequenceNumber: any;
  sourceBufferCache: Uint8Array[] = [];
  decode(packet: EncodedVideoChunkInit): void {
    const isAvcc = !!this.config?.description;
    if (!isAvcc) {
      const annexb = packet.data instanceof ArrayBuffer ? new Uint8Array(packet.data) : packet.data as Uint8Array;
      let sps, pps;
      let isIframe = false;
      // Function to find NAL unit boundaries
      const findNALUBoundaries = (data: Uint8Array): number[] => {
        const boundaries: number[] = [];
        for (let i = 0; i < data.length - 3; i++) {
          // Check for NAL unit start code: 0x00000001 or 0x000001
          if (
            data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0 && data[i + 3] === 1
          ) {
            boundaries.push(i + 4);
          } else if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 1) {
            boundaries.push(i + 3);
          }
        }
        return boundaries;
      };

      // Find NAL unit boundaries
      const nalBoundaries = findNALUBoundaries(annexb);

      // Extract NAL units
      const nalUnits: Uint8Array[] = [];
      for (let i = 0; i < nalBoundaries.length; i++) {
        const start = nalBoundaries[i];
        const end = i < nalBoundaries.length - 1 ? nalBoundaries[i + 1] : annexb.length;
        nalUnits.push(annexb.subarray(start, end));
      }
      // Check each NAL unit
      nalUnits.forEach((nalUnit, index) => {
        const nalUnitType = nalUnit[0] & 0x1F;
        if (nalUnitType === 7) {
          sps = nalUnit;
        } else if (nalUnitType === 8) {
          pps = nalUnit;
        } else if (nalUnitType === 5) {
          // IDR
          isIframe = true;
        }
      });
      if (sps && pps && !this.sourceBuffer) {
        const info = SPSParser.parseSPS(sps);
        const metaData: MP4Meta = {
          id: 1, // video tag data
          type: 'video',
          timescale: 1000,
          duration: 0,
          avcc: avcEncoderConfigurationRecord({ sps, pps }),
          codecWidth: info.codec_size.width,
          codecHeight: info.codec_size.height,
          presentWidth: info.present_size.width,
          presentHeight: info.present_size.height,
          videoType: 'avc'
        };
        // ftyp
        this.sourceBuffer = this.mse.addSourceBuffer(`video/mp4; codecs="${info.codec_mimetype}"`);
        this.sourceBuffer.appendBuffer(MP4.generateInitSegment(metaData));
        this.sourceBuffer.addEventListener('updateend', () => {
          if (this.sourceBufferCache.length) {
            this.sourceBuffer!.appendBuffer(this.sourceBufferCache.shift()!);
          }
        });
        // this.sourceBuffer.mode = 'sequence';
      } else {
        const avccBytes = nalUnits.reduce((acc, nal) => acc + nal.length + 4, 0);
        const mdatBytes = 8 + avccBytes;
        const mdatbox = new Uint8Array(mdatBytes);
        // mdat box用来存储视频碎片数据，
        const dataView = new DataView(mdatbox.buffer, 0);
        dataView.setUint32(0, mdatBytes, false);
        mdatbox.set(MP4.types.mdat, 4);
        let offset = 8;
        nalUnits.forEach((nalUnit) => {
          dataView.setUint32(offset, nalUnit.length, false);
          mdatbox.set(nalUnit, offset + 4);
          offset += nalUnit.length + 4;
        });
        const cacheTrack = {
          id: 1,
          sequenceNumber: ++this.sequenceNumber,
          size: avccBytes,
          dts: packet.timestamp,
          cts: packet.timestamp,
          isKeyframe: isIframe,
          data: annexb,
          flags: {
            isLeading: 0,
            dependsOn: 2,
            isDependedOn: 1,
            hasRedundancy: 0,
            isNonSync: 0
          },
          duration: 40,
        };
        const moofbox = MP4.moof(cacheTrack, packet.timestamp);

        const result = new Uint8Array(moofbox.byteLength + mdatbox.byteLength);
        result.set(moofbox, 0);
        result.set(mdatbox, moofbox.byteLength);
        if (this.sourceBuffer?.updating) {
          this.sourceBufferCache.push(result);
        } else {
          this.sourceBuffer?.appendBuffer(result);
        }
      }
    } else {
      try {
        const avccBytes = packet.data.byteLength;
        const mdatBytes = 8 + avccBytes;
        const mdatbox = new Uint8Array(mdatBytes);
        // mdat box用来存储视频碎片数据，
        const dataView = new DataView(mdatbox.buffer, 0);
        dataView.setUint32(0, mdatBytes, false);
        mdatbox.set(MP4.types.mdat, 4);
        const cacheTrack = {
          id: 1,
          sequenceNumber: ++this.sequenceNumber,
          size: avccBytes,
          dts: packet.timestamp,
          cts: packet.timestamp,
          isKeyframe: packet.type === 'key',
          data: packet.data,
          flags: {
            isLeading: 0,
            dependsOn: 2,
            isDependedOn: 1,
            hasRedundancy: 0,
            isNonSync: 0
          },
          duration: 40,
        };
        const moofbox = MP4.moof(cacheTrack, packet.timestamp);

        const result = new Uint8Array(moofbox.byteLength + mdatbox.byteLength);
        result.set(moofbox, 0);
        result.set(mdatbox, moofbox.byteLength);
        if (this.sourceBuffer?.updating) {
          this.sourceBufferCache.push(result);
        } else {
          this.sourceBuffer?.appendBuffer(result);
        }
      } catch (e) {
        console.log(this.element?.error);
        console.error(e);
      }
    }
  }
  flush(): void {
    throw new Error("Method not implemented.");
  }
  @ChangeState([], FSM.INIT, { sync: true })
  reset(): void {
    throw new Error("Method not implemented.");
  }
  @ChangeState([], "closed", { ignoreError: true, sync: true })
  close(): void {
    if (this.src) {
      URL.revokeObjectURL(this.src);
    }
  }
  mse!: MediaSource;
  src?: string;
  element?: HTMLVideoElement;
  config?: VideoDecoderConfig;
  @ChangeState([FSM.INIT, "closed"], "initialized")
  initialize(videoElement: HTMLVideoElement) {
    this.mse = new MediaSource();
    this.src = URL.createObjectURL(this.mse);
    this.element = videoElement;
    videoElement.src = this.src;
    return new Promise((resolve) => {
      this.mse.addEventListener('sourceopen', resolve);
    });
  }

  @ChangeState("initialized", "configured", { sync: true })
  configure(config: VideoDecoderConfig): void {
    this.config = config;
    if (config.description) {
      const avcc = config.description as Uint8Array;
      const spsStart = 6;
      const spsLength = (avcc[spsStart] << 8) | avcc[spsStart + 1];
      const sps = avcc.subarray(spsStart + 2, spsStart + 2 + spsLength);
      const info = SPSParser.parseSPS(sps);
      const metaData: MP4Meta = {
        id: 1, // video tag data
        type: 'video',
        timescale: 1000,
        duration: 0,
        avcc,
        codecWidth: info.codec_size.width,
        codecHeight: info.codec_size.height,
        presentWidth: info.present_size.width,
        presentHeight: info.present_size.height,
        videoType: 'avc'
      };
      console.log(metaData);
      // ftyp
      this.sourceBuffer = this.mse.addSourceBuffer(`video/mp4; codecs="${info.codec_mimetype}"`);
      this.sourceBuffer.appendBuffer(MP4.generateInitSegment(metaData));
      this.sourceBuffer.addEventListener('updateend', () => {
        if (this.sourceBufferCache.length) {
          this.sourceBuffer!.appendBuffer(this.sourceBufferCache.shift()!);
        }
      });
      // this.sourceBuffer.mode = 'sequence';
    }
  }
}
