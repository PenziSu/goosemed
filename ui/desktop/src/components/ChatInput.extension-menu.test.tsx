import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlTestWrapper } from '../i18n/test-utils';
import { ChatState } from '../types/chatState';
import ChatInput from './ChatInput';

const captured = vi.hoisted(() => ({
  extensionMenuProps: null as {
    sessionId: string | null;
    nextChatExtensionDraft?: { selectedNames: Set<string> };
    onNextChatExtensionDraftChange?: (draft: { selectedNames: Set<string> }) => void;
  } | null,
}));

vi.mock('./bottom_menu/BottomMenuExtensionSelection', () => ({
  BottomMenuExtensionSelection: (props: NonNullable<typeof captured.extensionMenuProps>) => {
    captured.extensionMenuProps = props;
    return <div data-testid="mcp-extension-menu" />;
  },
}));

vi.mock('./bottom_menu/DirSwitcher', () => ({ DirSwitcher: () => <div /> }));
vi.mock('./GitBranchIndicator', () => ({ GitBranchIndicator: () => <div /> }));
vi.mock('./bottom_menu/ContextWindowIndicator', () => ({
  ContextWindowIndicator: () => <div />,
}));
vi.mock('./alerts', () => ({
  AlertType: { Error: 'error', Warning: 'warning', Info: 'info' },
  useAlerts: () => ({ alerts: [], addAlert: vi.fn(), clearAlerts: vi.fn() }),
}));
vi.mock('./ModelAndProviderContext', () => ({
  useModelAndProvider: () => ({
    getCurrentModelAndProvider: vi.fn().mockResolvedValue({
      model: 'gpt-oss-120b',
      provider: 'openai',
    }),
    currentModel: 'gpt-oss-120b',
    currentProvider: 'openai',
  }),
}));
vi.mock('../hooks/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    isEnabled: false,
    dictationProvider: null,
    isRecording: false,
    isTranscribing: false,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
  }),
}));
vi.mock('../hooks/useFocusOnTyping', () => ({ useFocusOnTyping: vi.fn() }));
vi.mock('../hooks/useFileDrop', () => ({
  useFileDrop: () => ({
    droppedFiles: [],
    setDroppedFiles: vi.fn(),
    handleDrop: vi.fn(),
    handleDragOver: vi.fn(),
  }),
}));
vi.mock('../utils/workingDir', () => ({ getInitialWorkingDir: () => '/tmp/project' }));
vi.mock('../utils/analytics', () => ({
  trackFileAttached: vi.fn(),
  trackVoiceDictation: vi.fn(),
  trackDiagnosticsOpened: vi.fn(),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ChatInput MCP extension menu', () => {
  beforeEach(() => {
    captured.extensionMenuProps = null;
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  it('renders the MCP toggle and preserves the current session controls', () => {
    const draft = { selectedNames: new Set(['developer']) };
    const onDraftChange = vi.fn();

    render(
      <IntlTestWrapper>
        <ChatInput
          sessionId="session-1"
          handleSubmit={vi.fn()}
          chatState={ChatState.Idle}
          setView={vi.fn()}
          workingDir="/tmp/project"
          nextChatExtensionDraft={draft}
          onNextChatExtensionDraftChange={onDraftChange}
        />
      </IntlTestWrapper>
    );

    expect(screen.getByTestId('mcp-extension-menu')).toBeInTheDocument();
    expect(captured.extensionMenuProps).toEqual({
      sessionId: 'session-1',
      nextChatExtensionDraft: draft,
      onNextChatExtensionDraftChange: onDraftChange,
    });
  });
});
