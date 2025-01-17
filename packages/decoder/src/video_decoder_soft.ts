import { VideoDecoderSoftBase } from './video_decoder_soft_base';
import CreateModule from '../wasm/types/videodec';
export class VideoDecoderSoft extends VideoDecoderSoftBase {
  constructor(opt?: { workerMode?: boolean, yuvMode?: boolean, canvas?: HTMLCanvasElement, wasmPath?: string; }) {
    super(CreateModule, opt?.wasmPath ? fetch(opt?.wasmPath).then(res => res.arrayBuffer()) : void 0, opt?.workerMode, opt?.canvas, opt?.yuvMode);
  };
};
