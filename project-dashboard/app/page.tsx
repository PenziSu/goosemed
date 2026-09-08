'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock3,
  GripVertical,
  Plus,
  Save,
  ShieldCheck,
} from 'lucide-react';

import seedBoard from '@/data/board.json';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Priority = 'P0' | 'P1' | 'P2';

type TaskCard = {
  id: string;
  title: string;
  summary: string;
  acceptance: string;
  priority: Priority;
  updatedAt: string;
};

type BoardColumn = {
  id: string;
  title: string;
  accent: string;
  cards: TaskCard[];
};

type Board = {
  project: string;
  branch: string;
  updatedAt: string;
  columns: BoardColumn[];
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type WebMcpContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    },
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};

const initialBoard = seedBoard as Board;

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  }).format(new Date(value));
}

function priorityStyle(priority: Priority) {
  if (priority === 'P0') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'P1') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

export default function Home() {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [acceptance, setAcceptance] = useState('');

  useEffect(() => {
    fetch('/api/board')
      .then((response) => {
        if (!response.ok) throw new Error('board unavailable');
        return response.json() as Promise<Board>;
      })
      .then(setBoard)
      .catch(() => setSaveState('error'));
  }, []);

  const totals = useMemo(() => {
    const total = board.columns.reduce(
      (count, column) => count + column.cards.length,
      0,
    );
    const done =
      board.columns.find((column) => column.id === 'done')?.cards.length ?? 0;
    const active =
      board.columns.find((column) => column.id === 'in-progress')?.cards
        .length ?? 0;
    return { total, done, active };
  }, [board]);

  const persist = useCallback(async (nextBoard: Board) => {
    const updatedBoard = {
      ...nextBoard,
      updatedAt: new Date().toISOString(),
    };
    setBoard(updatedBoard);
    setSaveState('saving');

    try {
      const response = await fetch('/api/board', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBoard),
      });
      if (!response.ok) throw new Error('save failed');
      setSaveState('saved');
      window.setTimeout(() => setSaveState('idle'), 1600);
      return true;
    } catch {
      setSaveState('error');
      return false;
    }
  }, []);

  const moveCard = useCallback(
    async (cardId: string, targetColumnId: string) => {
      const movedCard = board.columns
        .flatMap((column) => column.cards)
        .find((candidate) => candidate.id === cardId);

      if (
        !movedCard ||
        !board.columns.some((column) => column.id === targetColumnId)
      )
        return false;
      const updatedCard = { ...movedCard, updatedAt: new Date().toISOString() };
      const nextBoard = {
        ...board,
        columns: board.columns.map((column) =>
          column.id === targetColumnId
            ? {
                ...column,
                cards: [
                  ...column.cards.filter(
                    (candidate) => candidate.id !== cardId,
                  ),
                  updatedCard,
                ],
              }
            : {
                ...column,
                cards: column.cards.filter(
                  (candidate) => candidate.id !== cardId,
                ),
              },
        ),
      };
      return persist(nextBoard);
    },
    [board, persist],
  );

  const addTask = useCallback(
    async (
      taskTitle: string,
      taskSummary: string,
      taskAcceptance: string,
      priority: Priority = 'P1',
    ) => {
      if (!taskTitle.trim()) return null;
      const task: TaskCard = {
        id: `task-${Date.now()}`,
        title: taskTitle.trim(),
        summary: taskSummary.trim(),
        acceptance: taskAcceptance.trim(),
        priority,
        updatedAt: new Date().toISOString(),
      };
      const nextBoard = {
        ...board,
        columns: board.columns.map((column) =>
          column.id === 'backlog'
            ? { ...column, cards: [...column.cards, task] }
            : column,
        ),
      };
      const saved = await persist(nextBoard);
      return saved ? task.id : null;
    },
    [board, persist],
  );

  function createTask() {
    if (!title.trim()) return;
    void addTask(title, summary, acceptance);
    setTitle('');
    setSummary('');
    setAcceptance('');
    setDialogOpen(false);
  }

  useEffect(() => {
    const modelContext = (
      document as Document & {
        modelContext?: WebMcpContext;
      }
    ).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    const options = { signal: lifecycle.signal };

    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'move_goosemed_task',
          title: '移動 GooseMed 任務',
          description:
            '將既有任務卡移到指定的看板欄位，並寫回地端 board.json。',
          inputSchema: {
            type: 'object',
            properties: {
              cardId: { type: 'string' },
              columnId: {
                type: 'string',
                enum: [
                  'backlog',
                  'ready',
                  'in-progress',
                  'verification',
                  'done',
                ],
              },
            },
            required: ['cardId', 'columnId'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const values = input as { cardId?: unknown; columnId?: unknown };
            if (
              typeof values.cardId !== 'string' ||
              typeof values.columnId !== 'string'
            ) {
              throw new Error('cardId and columnId are required');
            }
            const saved = await moveCard(values.cardId, values.columnId);
            if (!saved)
              throw new Error('task was not found or board could not be saved');
            return { cardId: values.cardId, columnId: values.columnId };
          },
        },
        options,
      ),
    ).catch(() => setSaveState('error'));

    void Promise.resolve(
      modelContext.registerTool(
        {
          name: 'create_goosemed_task',
          title: '建立 GooseMed 任務',
          description:
            '在待盤點欄位建立新的程式修改或驗證任務。不得包含病患資料。',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              summary: { type: 'string' },
              acceptance: { type: 'string' },
              priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
            },
            required: ['title'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const values = input as {
              title?: unknown;
              summary?: unknown;
              acceptance?: unknown;
              priority?: unknown;
            };
            if (typeof values.title !== 'string' || !values.title.trim()) {
              throw new Error('title is required');
            }
            const priority: Priority =
              values.priority === 'P0' || values.priority === 'P2'
                ? values.priority
                : 'P1';
            const cardId = await addTask(
              values.title,
              typeof values.summary === 'string' ? values.summary : '',
              typeof values.acceptance === 'string' ? values.acceptance : '',
              priority,
            );
            if (!cardId) throw new Error('board could not be saved');
            return { cardId, columnId: 'backlog' };
          },
        },
        options,
      ),
    ).catch(() => setSaveState('error'));

    return () => lifecycle.abort();
  }, [addTask, moveCard]);

  return (
    <main className="min-h-screen text-slate-950">
      <header className="border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-sm">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.16em] text-teal-700 uppercase">
                GooseMed
              </p>
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                醫療資料安全開發看板
              </h1>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="lg" />}>
              <Plus data-icon="inline-start" />
              新增任務
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>新增修改任務</DialogTitle>
                <DialogDescription>
                  只記錄程式修改與驗證資訊，不得填入病患資料。
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <label
                  htmlFor="task-title"
                  className="grid gap-2 text-sm font-medium"
                >
                  任務名稱
                  <Input
                    id="task-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label
                  htmlFor="task-summary"
                  className="grid gap-2 text-sm font-medium"
                >
                  修改範圍
                  <Textarea
                    id="task-summary"
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                  />
                </label>
                <label
                  htmlFor="task-acceptance"
                  className="grid gap-2 text-sm font-medium"
                >
                  驗收條件
                  <Textarea
                    id="task-acceptance"
                    value={acceptance}
                    onChange={(event) => setAcceptance(event.target.value)}
                  />
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={createTask} disabled={!title.trim()}>
                  建立卡片
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section className="mx-auto max-w-[1800px] px-5 py-5 lg:px-8">
        <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Badge
              variant="outline"
              className="border-teal-200 bg-teal-50 text-teal-800"
            >
              地端模式
            </Badge>
            <span className="truncate font-mono text-sm text-slate-600">
              {board.branch}
            </span>
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <span className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock3 className="size-4" aria-hidden="true" />
              更新於 {formatTimestamp(board.updatedAt)}
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-sm font-medium">
              {saveState === 'saving' && (
                <>
                  <Save className="size-4 animate-pulse" />
                  儲存中
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <CheckCircle2 className="size-4 text-teal-600" />
                  已儲存
                </>
              )}
              {saveState === 'error' && (
                <span className="text-red-700">無法寫入看板資料</span>
              )}
            </span>
          </div>

          <div className="flex divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">全部</p>
              <p className="text-lg font-semibold">{totals.total}</p>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">進行中</p>
              <p className="text-lg font-semibold text-blue-700">
                {totals.active}
              </p>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs font-medium text-slate-500">完成</p>
              <p className="text-lg font-semibold text-teal-700">
                {totals.done}
              </p>
            </div>
          </div>
        </div>

        <div className="board-scroll flex min-h-[calc(100vh-190px)] gap-4 overflow-x-auto pb-6">
          {board.columns.map((column) => (
            // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
            <section
              key={column.id}
              className="flex w-[320px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/80 p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedCardId) void moveCard(draggedCardId, column.id);
                setDraggedCardId(null);
              }}
            >
              <div className="mb-3 flex items-center gap-2 px-1.5 py-1">
                <span className={`size-2.5 rounded-full ${column.accent}`} />
                <h2 className="font-semibold tracking-tight">{column.title}</h2>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200">
                  {column.cards.length}
                </span>
              </div>

              <div className="grid content-start gap-3">
                {column.cards.map((card) => (
                  // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                  <article
                    key={card.id}
                    draggable
                    onDragStart={() => setDraggedCardId(card.id)}
                    onDragEnd={() => setDraggedCardId(null)}
                    className="group cursor-grab rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/5%)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:cursor-grabbing"
                  >
                    <div className="mb-3 flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={priorityStyle(card.priority)}
                      >
                        {card.priority}
                      </Badge>
                      <GripVertical className="ml-auto size-4 text-slate-300 transition group-hover:text-slate-500" />
                    </div>
                    <h3 className="text-[15px] font-semibold leading-6">
                      {card.title}
                    </h3>
                    {card.summary && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {card.summary}
                      </p>
                    )}
                    {card.acceptance && (
                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-[11px] font-bold tracking-[0.08em] text-slate-400 uppercase">
                          驗收
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {card.acceptance}
                        </p>
                      </div>
                    )}
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Activity className="size-3.5" aria-hidden="true" />
                      {formatTimestamp(card.updatedAt)}
                    </p>
                  </article>
                ))}

                {column.cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
                    拖曳卡片到這裡
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
