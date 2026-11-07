import { useRef, useState } from 'react';
import { FloatingIndicator, UnstyledButton } from '@mantine/core';
import classes from './floating-indicator.module.css';

const data = ['React', 'Vue', 'Angular', 'Svelte'];

export default function Demo() {
  const [rootRef, setRootRef] = useState<HTMLDivElement | null>(null);
  const controlsRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  const controls = data.map((item, index) => (
    <UnstyledButton
      key={item}
      className={classes.control}
      ref={(node) => {
        controlsRefs.current[index] = node;
      }}
      onClick={() => setActive(index)}
      aria-pressed={active === index}
      mod={{ active: active === index }}
    >
      <span className={classes.controlLabel}>{item}</span>
    </UnstyledButton>
  ));

  return (
    <div className={classes.root} ref={setRootRef}>
      {controls}

      <FloatingIndicator
        target={controlsRefs.current[active] ?? null}
        parent={rootRef}
        className={classes.indicator}
      />
    </div>
  );
}
