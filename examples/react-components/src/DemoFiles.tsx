import { useEffect, useRef, useState, type ReactNode } from 'react';

type Sample = { name: string; type: string; url: string };

export default function DemoFiles({
  pick,
  samples,
  sampleButton,
}: {
  pick: (open: () => void) => ReactNode;
  samples?: Sample[];
  sampleButton?: (
    label: string,
    active: boolean,
    open: () => void,
  ) => ReactNode;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [sample, setSample] = useState<Sample>();
  const [failed, setFailed] = useState(false);
  const [localSource, setLocalSource] = useState('');
  useEffect(() => {
    if (!file) {
      setLocalSource('');
      return;
    }
    const url = URL.createObjectURL(file);
    setLocalSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const source = sample ? import.meta.env.BASE_URL + sample.url : localSource;
  const name = sample?.name ?? file?.name;
  const type = sample?.type ?? file?.type.split('/')[0];
  return (
    <section className="demo-files">
      <h1>文件</h1>
      <p>选择图片、音频或视频，在当前浏览器预览。</p>
      <input
        ref={picker}
        hidden
        type="file"
        accept="image/*,audio/*,video/*"
        onChange={(event) => {
          const next = event.target.files?.[0];
          if (!next) return;
          setSample(undefined);
          setFailed(false);
          setFile(next);
          event.target.value = '';
        }}
      />
      <div className="react-component-actions">
        {pick(() => picker.current?.click())}
        {file && <span>{file.name}</span>}
      </div>
      {samples && sampleButton && (
        <div
          className="react-component-actions demo-file-samples"
          aria-label="示例文件"
        >
          {samples.map((item) => (
            <div key={item.url}>
              {sampleButton('预览' + item.name, sample === item, () => {
                setFailed(false);
                setFile(undefined);
                setSample(item);
              })}
            </div>
          ))}
        </div>
      )}
      {name && source && (
        <>
          {samples && <p role="status">正在预览：{name}</p>}
          {failed ? (
            <p role="alert">无法加载此文件，请选择其他文件。</p>
          ) : type === 'image' ? (
            <img src={source} alt={name} onError={() => setFailed(true)} />
          ) : type === 'audio' ? (
            <audio src={source} controls onError={() => setFailed(true)} />
          ) : type === 'video' ? (
            <video
              src={source}
              controls
              playsInline
              onError={() => setFailed(true)}
            />
          ) : (
            <p role="alert">请选择支持预览的图片、音频或视频。</p>
          )}
        </>
      )}
    </section>
  );
}
