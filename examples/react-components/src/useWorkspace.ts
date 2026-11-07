import { useState, useEffect, useRef } from 'react';
import {
  createOperationsClient,
  formatTime,
  runLabel,
} from '../../ui-demo/operations';
export { formatTime, runLabel };
export function useWorkspace(load = true) {
  const client = useRef<ReturnType<typeof createOperationsClient> | null>(null);
  if (!client.current) client.current = createOperationsClient();
  const api = client.current;
  const [state, setState] = useState(api.snapshot());
  const [values, setValues] = useState<
    Record<string, string | number | boolean>
  >({});
  useEffect(() => {
    const unsubscribe = api.subscribe(() => setState(api.snapshot()));
    if (load) void api.refresh();
    return () => {
      unsubscribe();
      api.dispose();
    };
  }, [api, load]);
  useEffect(() => {
    setValues(state.data?.management?.settings?.values || {});
  }, [state.data?.management?.settings]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [name, setName] = useState(''),
    [days, setDays] = useState(30),
    [confirm, setConfirm] = useState(''),
    [task, setTask] = useState('check-bindings'),
    [minutes, setMinutes] = useState(60);
  return {
    client: api,
    state,
    values,
    setValues,
    name,
    setName,
    days,
    setDays,
    confirm,
    setConfirm,
    task,
    setTask,
    minutes,
    setMinutes,
    inputs,
    setInputs,
  };
}
