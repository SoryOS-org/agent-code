/**
 * @packages/database/store
 * In-memory repository implementation with strict user ownership isolation
 */

import type { Attachment, Conversation, Message, User, UserPreferences } from '@packages/types/src/index.ts';

export interface DatabaseRepository {
  getUser(userId: string): Promise<User | null>;
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences>;

  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string, userId: string): Promise<Conversation | null>;
  createConversation(data: {
    userId: string;
    title?: string;
    modelId?: string;
    providerId?: string;
    systemPrompt?: string;
    temperature?: number;
  }): Promise<Conversation>;
  updateConversation(
    id: string,
    userId: string,
    updates: { title?: string; pinned?: boolean; modelId?: string; systemPrompt?: string; temperature?: number }
  ): Promise<Conversation | null>;
  deleteConversation(id: string, userId: string): Promise<boolean>;

  listMessages(conversationId: string, userId: string): Promise<Message[]>;
  addMessage(
    conversationId: string,
    userId: string,
    message: Omit<Message, 'id' | 'conversationId' | 'createdAt'> & { id?: string }
  ): Promise<Message>;

  createAttachment(
    userId: string,
    conversationId: string,
    file: { name: string; mimeType: string; size: number; base64Data?: string }
  ): Promise<Attachment>;
}

export class InMemoryDatabase implements DatabaseRepository {
  private users = new Map<string, User>();
  private preferences = new Map<string, UserPreferences>();
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message[]>(); // key: conversationId
  private attachments = new Map<string, Attachment>();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    const defaultUser: User = {
      id: 'usr_default',
      email: 'user@aether-ai.local',
      name: 'Utilisateur',
      createdAt: new Date().toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);

    this.preferences.set(defaultUser.id, {
      theme: 'system',
      defaultModel: 'gemini-3.8-flash',
      systemPrompt: 'Tu es un assistant IA bienveillant, concis, précis et expert en développement, analyse et rédaction.',
      temperature: 0.7,
      maxTokens: 4096,
      streamResponses: true,
    });

    // Seed a welcome conversation
    const welcomeConv: Conversation = {
      id: 'conv_welcome',
      userId: defaultUser.id,
      title: 'Bienvenue sur Aether AI',
      modelId: 'gemini-3.8-flash',
      providerId: 'gemini',
      pinned: true,
      messageCount: 2,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(welcomeConv.id, welcomeConv);

    const welcomeMessages: Message[] = [
      {
        id: 'msg_1',
        conversationId: welcomeConv.id,
        role: 'user',
        content: 'Présente-toi et explique comment fonctionne cette application.',
        createdAt: new Date(Date.now() - 3500000).toISOString(),
      },
      {
        id: 'msg_2',
        conversationId: welcomeConv.id,
        role: 'assistant',
        content: `### Bonjour ! Je suis Aether AI ⚡

Je suis votre assistant IA complet, conçu avec une architecture modulaire, sécurisée et évolutive.

#### ✨ Principales fonctionnalités :
1. **Multi-fournisseurs intégrés** : Google Gemini (3.8 Flash, 4 Argon), adaptateurs OpenAI, Mistral et mode Test Hors-ligne.
2. **Streaming en direct (SSE)** : Réponses en temps réel ultra-fluides.
3. **Moteur d'orchestration indépendant** : Gestion intelligente du contexte, mémoire glissante et outils intégrés (calculateur, analyse de texte, horloge).
4. **Prise en charge des fichiers** : Ajoutez des images ou documents pour analyse multimodale.
5. **Isolation et sécurité strictes** : Vos conversations sont privées et sécurisées par utilisateur, et les clés API restent exclusivement côté serveur.

Posez-moi une question, collez un extrait de code ou demandez-moi de résoudre un problème complexe !`,
        metadata: {
          model: 'gemini-3.8-flash',
          tokens: 185,
          latencyMs: 340,
          finishReason: 'stop',
        },
        createdAt: new Date(Date.now() - 3400000).toISOString(),
      },
    ];
    this.messages.set(welcomeConv.id, welcomeMessages);
  }

  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const existing = this.preferences.get(userId);
    if (existing) return existing;

    const defaultPrefs: UserPreferences = {
      theme: 'system',
      defaultModel: 'gemini-3.8-flash',
      systemPrompt: 'Tu es un assistant IA précis, concis et méthodique.',
      temperature: 0.7,
      maxTokens: 4096,
      streamResponses: true,
    };
    this.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  }

  async updateUserPreferences(
    userId: string,
    prefs: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...prefs };
    this.preferences.set(userId, updated);
    return updated;
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  async getConversation(id: string, userId: string): Promise<Conversation | null> {
    const conv = this.conversations.get(id);
    if (!conv) return null;
    // Strict ownership verification
    if (conv.userId !== userId) return null;
    return conv;
  }

  async createConversation(data: {
    userId: string;
    title?: string;
    modelId?: string;
    providerId?: string;
    systemPrompt?: string;
    temperature?: number;
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conv: Conversation = {
      id,
      userId: data.userId,
      title: data.title || 'Nouvelle conversation',
      modelId: data.modelId || 'gemini-3.8-flash',
      providerId: data.providerId || 'gemini',
      systemPrompt: data.systemPrompt,
      temperature: data.temperature ?? 0.7,
      pinned: false,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.conversations.set(id, conv);
    this.messages.set(id, []);
    return conv;
  }

  async updateConversation(
    id: string,
    userId: string,
    updates: { title?: string; pinned?: boolean; modelId?: string; systemPrompt?: string; temperature?: number }
  ): Promise<Conversation | null> {
    const conv = await this.getConversation(id, userId);
    if (!conv) return null;

    if (updates.title !== undefined) conv.title = updates.title;
    if (updates.pinned !== undefined) conv.pinned = updates.pinned;
    if (updates.modelId !== undefined) conv.modelId = updates.modelId;
    if (updates.systemPrompt !== undefined) conv.systemPrompt = updates.systemPrompt;
    if (updates.temperature !== undefined) conv.temperature = updates.temperature;
    conv.updatedAt = new Date().toISOString();

    this.conversations.set(id, conv);
    return conv;
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const conv = await this.getConversation(id, userId);
    if (!conv) return false;

    this.conversations.delete(id);
    this.messages.delete(id);
    return true;
  }

  async listMessages(conversationId: string, userId: string): Promise<Message[]> {
    const conv = await this.getConversation(conversationId, userId);
    if (!conv) return [];
    return this.messages.get(conversationId) || [];
  }

  async addMessage(
    conversationId: string,
    userId: string,
    message: Omit<Message, 'id' | 'conversationId' | 'createdAt'> & { id?: string }
  ): Promise<Message> {
    const conv = await this.getConversation(conversationId, userId);
    if (!conv) {
      throw new Error('Conversation non trouvée ou accès refusé');
    }

    const msgList = this.messages.get(conversationId) || [];
    const newMsg: Message = {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId,
      role: message.role,
      content: message.content,
      attachments: message.attachments,
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      metadata: message.metadata,
      createdAt: new Date().toISOString(),
    };

    msgList.push(newMsg);
    this.messages.set(conversationId, msgList);

    // Update conversation metadata
    conv.updatedAt = newMsg.createdAt;
    conv.messageCount = msgList.length;

    // Auto-name conversation if title is still default
    if (conv.title === 'Nouvelle conversation' && message.role === 'user' && message.content) {
      const generatedTitle = message.content.trim().slice(0, 36);
      conv.title = generatedTitle.length > 35 ? `${generatedTitle}...` : generatedTitle;
    }

    this.conversations.set(conversationId, conv);
    return newMsg;
  }

  async createAttachment(
    userId: string,
    conversationId: string,
    file: { name: string; mimeType: string; size: number; base64Data?: string }
  ): Promise<Attachment> {
    const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const attachment: Attachment = {
      id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      base64Data: file.base64Data,
      createdAt: new Date().toISOString(),
    };
    this.attachments.set(id, attachment);
    return attachment;
  }
}

// Export singleton database repository
export const db: DatabaseRepository = new InMemoryDatabase();
