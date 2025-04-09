
# 哈哈
-
-
-
-
-
-
-
-
-
-
<Rice/>


## MP4放进去以后一直加载不成功怎么办（有报错信息）

> 播放器会报：“cannot find moov or mdat box” 错误

确认moov box 是否在mdat box之前

> 其实就是按照fmp4格式封装就行了。


使用FFMpeg 确定 moov位置:

```
ffprobe 视频.mp4 -v trace 2>&1 | grep 'mdat\|moov'
```

输出如下，type:'moov' 在 type:'mdat'之前就是正常的，否则就是错误。

```
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'moov' parent:'root' sz: 7993 36 815638
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'mvhd' parent:'moov' sz: 108 8 7985
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'trak' parent:'moov' sz: 5480 116 7985
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'trak' parent:'moov' sz: 2268 5596 7985
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'udta' parent:'moov' sz: 129 7864 7985
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x7fd30d004400] type:'mdat' parent:'root' sz: 807609 8037 815638
```

解决方法

mp4 将moov box前置（不转码方法）

```
ffmpeg -i input.mp4 -vcodec copy -acodec copy -movflags faststart -y output.mp4
```

大体确定MOOV的范围 调整coreProbePart参数大小(0-1 = 0%-100%)

如果出现了报错：

```
[mp4 @ 0x7fb737f05600] Could not find tag for codec pcm_alaw in stream #1, codec not currently supported in container
[out#0/mp4 @ 0x7fb737f04440] Could not write header (incorrect codec parameters ?): Invalid argument
```

这个错误表明在尝试将视频重新封装时遇到了音频编解码器兼容性的问题。具体来说，源文件中的音频编码格式是 PCM A-law (pcm_alaw)，而 MP4 容器格式默认不支持这种未压缩的音频编码。
让我们修改一下命令来解决这个问题。我建议将音频转换为 MP4 容器广泛支持的 AAC 编码格式：

```
./ffmpeg -i input.mp4 -vcodec copy -acodec aac -movflags faststart -y output.mp4
```

见图
<img src="/public/img/vod-coreProbePart.png">



## MP4放进去以后一直加载不成功怎么办（无报错信息）

检查下Network的是否正在大量下载数据，如果是这样，那就是可能服务器不支持Range请求，导致需要等到完整的文件下载完毕才能播放。


检查下network 有没有报：`ERR_CONTENT_LENGTH_MISMATCH` 错误




解决方法：

1. 服务器支持Range请求即可。
