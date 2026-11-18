export interface CompanionChapter {
  id: string; title: string; subject: string; pages: number; sha256: string;
  available: boolean;
}
export interface CompanionBridge {
  listCompanionChapters(): Promise<CompanionChapter[]>;
  openCompanionChapter(id: string): Promise<void>;
}
