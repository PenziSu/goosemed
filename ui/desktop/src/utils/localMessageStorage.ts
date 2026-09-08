const MAX_MESSAGES = 500;

export class LocalMessageStorage {
  private static messages: string[] = [];

  static addMessage(content: string) {
    if (!content.trim()) return;

    if (this.messages.at(-1) === content) {
      return;
    }

    this.messages.push(content);
    this.messages = this.messages.slice(-MAX_MESSAGES);
  }

  static getRecentMessages(): string[] {
    return [...this.messages].reverse();
  }

  static clearHistory() {
    this.messages = [];
  }
}
