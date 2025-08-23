'use client';

import type { Session } from '@supabase/auth-helpers-nextjs';

interface Message { 
  role: 'user' | 'assistant';
  content: string;
}
interface NPC { 
  name: string;
  description: string;
  state: string;
}
interface Story {
  id: number;
  created_at: string;
  history: Message[] | null;
  user_id: string;
  title?: string;
  game_mode?: string;
  npcs?: NPC[] | null;
  is_multiplayer?: boolean;
  status?: string;
}

interface SidebarProps {
  stories: Story[];
  session: Session | null;
  activeStoryId: number | null;
  storyLimit: number;
  onNewStory: () => void;
  onSelectStory: (id: number) => void;
  onDeleteStory: (id: number) => void;
  onLogout: () => void;
  onChatToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  stories,
  session,
  activeStoryId,
  storyLimit,
  onNewStory,
  onSelectStory,
  onDeleteStory,
  onLogout,
  onChatToggle,
}) => {
  const storiesReachedLimit = stories.length >= storyLimit;

  return (
    <div className="sidebar-content-wrapper">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Hikayelerim</h2>
        <button
          className="new-story-button white-button"
          onClick={onNewStory}
          disabled={storiesReachedLimit}
          title={storiesReachedLimit ? `Maksimum ${storyLimit} hikayeye ulaştınız.` : 'Yeni bir maceraya başla'}
        >
          +
        </button>
      </div>

      <ul className="story-list">
        {stories.map((story) => (
          <li
            key={story.id}
            className={`story-item ${story.id === activeStoryId ? 'active' : ''}`}
          >
            <span
              className="story-title"
              onClick={() => onSelectStory(story.id)}
            >
              {story.title || 'İsimsiz Macera'}
            </span>
            {story.is_multiplayer && <span className="story-mode-badge">DND {story.status}</span>}
            {!story.is_multiplayer && <span className="story-mode-badge">{story.game_mode?.replace(/_/g, ' ') || 'classic'}</span>}
            <button
              className="delete-button"
              onClick={() => onDeleteStory(story.id)}
              title="Hikayeyi Sil"
            >
              Sil
            </button>
          </li>
        ))}
      </ul>
      
      <button className="sidebar-chat-button" onClick={onChatToggle}>
        Global Sohbet
      </button>

      <div className="sidebar-footer">
        {session?.user?.email && (
          <p className="sidebar-user-email">{session.user.email}</p>
        )}
        {storiesReachedLimit && (
            <p className="story-limit-warning">
                Hikaye limitine ulaşıldı ({stories.length}/{storyLimit}).
            </p>
        )}
        <button className="logout-button white-button" onClick={onLogout}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default Sidebar;