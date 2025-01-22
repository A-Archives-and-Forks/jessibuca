export const samplingFrequencyIndexMap = [
  96000,
  88200,
  64000,
  48000,
  44100,
  32000,
  24000,
  22050,
  16000,
  12000,
  11025,
  8000,
  7350,
  -1, // reserved
  -1, // reserved
  -1, // reserved
];

/**
 * Convert AVCC format NAL units to Annex-B format
 * @param avcc Input buffer containing AVCC formatted NAL units
 * @param isKeyframe Whether this is a keyframe (to determine if we need to add parameter sets)
 * @param description Optional parameter sets (SPS/PPS) to add for keyframes
 * @returns Buffer containing Annex-B formatted NAL units
 */
export function avccToAnnexb(avcc: Uint8Array, isKeyframe: boolean = false, description?: Uint8Array): Uint8Array {
  const startCode = new Uint8Array([0, 0, 0, 1]);
  let totalLength = avcc.length;

  // If this is a keyframe and we have parameter sets, calculate extra space
  if (isKeyframe && description instanceof Uint8Array) {
    let offset = 1;
    const numArrays = description[0];
    for (let i = 0; i < numArrays; i++) {
      const numNalus = (description[offset + 1] << 8) | description[offset + 2];
      offset += 3;
      for (let j = 0; j < numNalus; j++) {
        const naluLength = (description[offset] << 8) | description[offset + 1];
        totalLength += naluLength + 4; // Add start code length
        offset += 2 + naluLength;
      }
    }
  }

  const annexb = new Uint8Array(totalLength);
  let offset = 0;

  // If this is a keyframe, write parameter sets first
  if (isKeyframe && description instanceof Uint8Array) {
    let descOffset = 1;
    const numArrays = description[0];
    for (let i = 0; i < numArrays; i++) {
      const numNalus = (description[descOffset + 1] << 8) | description[descOffset + 2];
      descOffset += 3;
      for (let j = 0; j < numNalus; j++) {
        const naluLength = (description[descOffset] << 8) | description[descOffset + 1];
        annexb.set(startCode, offset);
        annexb.set(description.subarray(descOffset + 2, descOffset + 2 + naluLength), offset + 4);
        offset += naluLength + 4;
        descOffset += 2 + naluLength;
      }
    }
  }

  // Convert NAL units: replace length field with start code
  let i = 0;
  while (i < avcc.length) {
    const naluLength = (avcc[i] << 24) | (avcc[i + 1] << 16) | (avcc[i + 2] << 8) | avcc[i + 3];
    annexb.set(startCode, offset);
    annexb.set(avcc.subarray(i + 4, i + 4 + naluLength), offset + 4);
    offset += naluLength + 4;
    i += naluLength + 4;
  }

  return annexb;
}

export function adtsToAsc(adts: Uint8Array) {
  const profile = ((adts[2] & 0xc0) >>> 6) + 1;
  const samplingFrequencyIndex = (adts[2] & 0x3c) >>> 2;
  const channelConfiguration = ((adts[2] & 0x01) << 2) | ((adts[3] & 0xc0) >>> 6);
  const audioSpecificConfig = new Uint8Array([
    ((profile & 0x03) << 3) | ((samplingFrequencyIndex & 0x0e) >> 1),
    ((samplingFrequencyIndex & 0x01) << 7) | ((channelConfiguration & 0x0f) << 3),
  ]);
  return {
    profile,
    sampleRate: samplingFrequencyIndexMap[samplingFrequencyIndex],
    channel: channelConfiguration,
    audioSpecificConfig
  };
}

/**
 * Convert Annex-B format NAL units to AVCC format
 * @param annexb Input buffer containing Annex-B formatted NAL units
 * @returns Buffer containing AVCC formatted NAL units
 */
export function annexbToAvcc(annexb: Uint8Array): Uint8Array {
  const nalus: { type: number; data: Uint8Array; }[] = [];
  let offset = 0;

  // Find all NAL units
  while (offset < annexb.length) {
    // Find start code
    while (offset < annexb.length - 3 &&
      !(annexb[offset] === 0 && annexb[offset + 1] === 0 &&
        (annexb[offset + 2] === 1 || (annexb[offset + 2] === 0 && annexb[offset + 3] === 1)))) {
      offset++;
    }

    if (offset >= annexb.length - 3) break;

    const startCodeLength = annexb[offset + 2] === 1 ? 3 : 4;
    const naluStart = offset + startCodeLength;
    offset = naluStart;

    // Find next start code
    while (offset < annexb.length - 3 &&
      !(annexb[offset] === 0 && annexb[offset + 1] === 0 &&
        (annexb[offset + 2] === 1 || (annexb[offset + 2] === 0 && annexb[offset + 3] === 1)))) {
      offset++;
    }

    const naluData = annexb.subarray(naluStart, offset);
    const naluType = naluData[0] & 0x1F; // For H.264
    nalus.push({ type: naluType, data: naluData });
  }

  // Calculate total size needed for AVCC format
  let totalSize = 0;
  for (const nalu of nalus) {
    totalSize += 4 + nalu.data.length; // 4 bytes for length
  }

  const avcc = new Uint8Array(totalSize);
  let dstOffset = 0;

  // Write NAL units in AVCC format
  for (const nalu of nalus) {
    const length = nalu.data.length;
    avcc[dstOffset] = (length >> 24) & 0xFF;
    avcc[dstOffset + 1] = (length >> 16) & 0xFF;
    avcc[dstOffset + 2] = (length >> 8) & 0xFF;
    avcc[dstOffset + 3] = length & 0xFF;
    avcc.set(nalu.data, dstOffset + 4);
    dstOffset += 4 + length;
  }

  return avcc;
}

/**
 * Create AVCC configuration record from SPS and PPS NAL units
 * @param sps Sequence Parameter Set NAL unit (without start code)
 * @param pps Picture Parameter Set NAL unit (without start code)
 * @returns AVCC configuration record
 */
export function createAVCDecoderConfigurationRecord(sps: Uint8Array, pps: Uint8Array): Uint8Array {
  const avccLength = 7 + sps.length + 2 + pps.length;
  const avcc = new Uint8Array(avccLength);

  // Write AVCC header
  avcc[0] = 1; // version
  avcc[1] = sps[1]; // profile
  avcc[2] = sps[2]; // profile compat
  avcc[3] = sps[3]; // level
  avcc[4] = 0xFF; // 6 bits reserved + 2 bits nal size length - 1 (4 bytes)
  avcc[5] = 0xE1; // 3 bits reserved + 5 bits number of SPS (1)

  // Write SPS
  avcc[6] = (sps.length >> 8) & 0xFF;
  avcc[7] = sps.length & 0xFF;
  avcc.set(sps, 8);

  // Write number of PPS
  let offset = 8 + sps.length;
  avcc[offset] = 1; // number of PPS
  offset++;

  // Write PPS
  avcc[offset] = (pps.length >> 8) & 0xFF;
  avcc[offset + 1] = pps.length & 0xFF;
  avcc.set(pps, offset + 2);

  return avcc;
}

/**
 * Extract SPS and PPS NAL units from Annex-B formatted data
 * @param data Input buffer containing Annex-B formatted NAL units
 * @param isHevc Whether the data is HEVC/H.265 (true) or AVC/H.264 (false)
 * @returns Object containing arrays of SPS and PPS NAL units
 */
export function extractParameterSets(data: Uint8Array, isHevc: boolean = false): {
  sps: Uint8Array[];
  pps: Uint8Array[];
  vps?: Uint8Array[];
} {
  let offset = 0;
  const spsNalus: Uint8Array[] = [];
  const ppsNalus: Uint8Array[] = [];
  const vpsNalus: Uint8Array[] = [];

  while (offset < data.length - 3) {
    // Find start code
    while (offset < data.length - 3 &&
      !(data[offset] === 0 && data[offset + 1] === 0 &&
        (data[offset + 2] === 1 || (data[offset + 2] === 0 && data[offset + 3] === 1)))) {
      offset++;
    }

    if (offset >= data.length - 3) break;

    const startCodeLength = data[offset + 2] === 1 ? 3 : 4;
    const naluStart = offset + startCodeLength;
    offset = naluStart;

    // Find next start code
    while (offset < data.length - 3 &&
      !(data[offset] === 0 && data[offset + 1] === 0 &&
        (data[offset + 2] === 1 || (data[offset + 2] === 0 && data[offset + 3] === 1)))) {
      offset++;
    }

    const naluData = data.subarray(naluStart, offset);

    if (!isHevc) { // H.264
      const naluType = naluData[0] & 0x1F;
      if (naluType === 7) { // SPS
        spsNalus.push(naluData);
      } else if (naluType === 8) { // PPS
        ppsNalus.push(naluData);
      }
    } else { // H.265
      const naluType = (naluData[0] >> 1) & 0x3F;
      if (naluType === 32) { // VPS
        vpsNalus.push(naluData);
      } else if (naluType === 33) { // SPS
        spsNalus.push(naluData);
      } else if (naluType === 34) { // PPS
        ppsNalus.push(naluData);
      }
    }
  }

  return isHevc ? { sps: spsNalus, pps: ppsNalus, vps: vpsNalus } : { sps: spsNalus, pps: ppsNalus };
}