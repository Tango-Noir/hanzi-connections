import React from 'react';
import {
  AbsoluteFill,
  Composition,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  registerRoot,
} from 'remotion';

// 1080x1920 竖屏，30fps。截图 960x1706（≈9:16）全屏 cover 铺满，不留白。
const W = 1080;
const H = 1920;
const FPS = 30;

type SceneDef = {
  img: string | null;
  kind: 'credit' | 'intro' | 'page' | 'outro' | 'submit';
  cap?: string;
  dur: number; // 帧
};

const SCENES: SceneDef[] = [
  { img: null, kind: 'credit', dur: 90 },
  { img: '01-select.png', kind: 'intro', dur: 90 },
  { img: '02-puzzle.png', kind: 'page', cap: '模式一：单字', dur: 90 },
  { img: '03-selected.png', kind: 'page', cap: '点选 4 个，一起提交', dur: 90 },
  { img: '04-close.png', kind: 'page', cap: '猜错扣心，「差一点」会提示', dur: 90 },
  { img: '05-solved.png', kind: 'page', cap: '猜对：锁定，公开联系', dur: 90 },
  { img: '07-2zi.png', kind: 'page', cap: '模式二：二字词', dur: 90 },
  { img: '08-4zi.png', kind: 'page', cap: '模式三：四字词', dur: 90 },
  { img: '06-win.png', kind: 'outro', dur: 150 },
  { img: null, kind: 'submit', dur: 120 },
];

const FONT = 'system-ui, "Microsoft YaHei", "PingFang SC", sans-serif';

// 单个场景：全屏截图 + 缓慢推近 + 黑场淡入淡出 + 底部大字字幕
const Scene = ({ def }: { def: SceneDef }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = def.dur;

  // 推近：1.00 → 1.06
  const scale = interpolate(frame, [0, d], [1.0, 1.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 淡入淡出（经过黑场）
  const opacity =
    interpolate(frame, [0, 10], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.3, 0, 0.7, 1),
    }) *
    interpolate(frame, [d - 10, d], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.3, 0, 0.7, 1),
    });

  // 字幕进入
  const capIn = interpolate(frame, [6, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const capY = interpolate(frame, [6, 20], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // 纯字卡：来源说明（开头）/ 投稿号召（结尾）
  if (!def.img) {
    return (
      <AbsoluteFill style={{ background: '#142d39', opacity }}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          {def.kind === 'credit' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 44,
                padding: '0 80px',
                textAlign: 'center',
                opacity: capIn,
                transform: `translateY(${capY}px)`,
                fontFamily: FONT,
              }}
            >
              <div style={{ color: 'rgba(255,248,237,0.6)', fontSize: 40, letterSpacing: 8, fontWeight: 600 }}>
                汉字联系
              </div>
              <div style={{ color: '#ffffff', fontSize: 82, fontWeight: 900, lineHeight: 1.3, letterSpacing: 2 }}>
                模仿纽约时报
                <br />
                《Connections》
              </div>
              <div style={{ color: 'rgba(255,248,237,0.8)', fontSize: 46, fontWeight: 600, letterSpacing: 3 }}>
                汉字版 · 每天一道
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 40,
                padding: '0 80px',
                textAlign: 'center',
                opacity: capIn,
                transform: `translateY(${capY}px)`,
                fontFamily: FONT,
              }}
            >
              <div style={{ color: '#ffffff', fontSize: 80, fontWeight: 900, letterSpacing: 3 }}>
                有好的题目吗？
              </div>
              <div style={{ color: '#f26445', fontSize: 64, fontWeight: 800, letterSpacing: 4 }}>
                私信投稿给我
              </div>
              <div style={{ color: 'rgba(255,248,237,0.72)', fontSize: 42, letterSpacing: 3 }}>
                选入每日题，署名致谢
              </div>
            </div>
          )}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: '#000', opacity }}>
      {/* 全屏截图 */}
      <Img
        src={staticFile(def.img)}
        style={{
          width: W,
          height: H,
          objectFit: 'cover',
          scale,
          filter: def.kind === 'intro' ? 'brightness(0.55)' : 'none',
        }}
      />

      {/* 通用底部压暗（仅中间页与结尾） */}
      {def.kind !== 'intro' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 420,
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 55%, rgba(0,0,0,0) 100%)',
            opacity: capIn,
          }}
        />
      )}

      {/* 开场：大标题 */}
      {def.kind === 'intro' && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div
            style={{
              transform: `translateY(${interpolate(frame, [0, 25], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })}px)`,
              opacity: interpolate(frame, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 34,
            }}
          >
            <div style={{ color: '#ffffff', fontSize: 170, fontWeight: 900, fontFamily: FONT, letterSpacing: 12, lineHeight: 1.1 }}>
              汉字联系
            </div>
            <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: 58, fontWeight: 600, fontFamily: FONT, letterSpacing: 6 }}>
              把 16 个字，分成 4 组
            </div>
            <div style={{ color: 'rgba(255,255,255,0.72)', fontSize: 42, fontFamily: FONT, letterSpacing: 4 }}>
              每天一题 · 打开即玩
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* 中间页：底部大字字幕 */}
      {def.kind === 'page' && def.cap && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 150,
            textAlign: 'center',
            color: '#ffffff',
            fontSize: 66,
            fontWeight: 800,
            fontFamily: FONT,
            letterSpacing: 3,
            lineHeight: 1.3,
            opacity: capIn,
            transform: `translateY(${capY}px)`,
            textShadow: '0 3px 14px rgba(0,0,0,0.5)',
          }}
        >
          {def.cap}
        </div>
      )}

      {/* 结尾：胜利 + 行动号召 */}
      {def.kind === 'outro' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 130,
            textAlign: 'center',
            opacity: capIn,
            transform: `translateY(${capY}px)`,
            fontFamily: FONT,
          }}
        >
          <div style={{ color: '#ffffff', fontSize: 84, fontWeight: 900, letterSpacing: 4, textShadow: '0 3px 14px rgba(0,0,0,0.5)' }}>
            4 组全对，胜利！
          </div>
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 46, fontWeight: 600, marginTop: 26, letterSpacing: 4 }}>
            每天更新 · 免费开玩
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Promo = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {SCENES.map((def, i) => {
        const s = start;
        start += def.dur;
        return (
          <Sequence key={i} from={s} durationInFrames={def.dur} name={`S${i}`}>
            <Scene def={def} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => {
  return (
    <Composition
      id="HanziPromo"
      component={Promo}
      durationInFrames={990}
      fps={FPS}
      width={W}
      height={H}
    />
  );
};

registerRoot(RemotionRoot);
