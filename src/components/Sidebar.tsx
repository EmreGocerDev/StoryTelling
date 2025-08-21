'use client';

import type { Session } from '@supabase/auth-helpers-nextjs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Story {
  id: number;
  created_at: string;
  history: Message[] | null;
  user_id: string;
  title?: string;
  game_mode?: string; // game_mode eklendi
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
}) => {
  const storiesReachedLimit = stories.length >= storyLimit;

  return (
    <div className="sidebar-content-wrapper">
      <div className="sidebar-header">
        <h2 className="sidebar-title">Hikayelerim</h2>
        <button
          className="new-story-button white-button"
          onClick={onNewStory} // Artık sadece onNewStory'yi çağırıyor
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
            {/* YENİ: Oyun modu etiketi */}
            <span className="story-mode-badge">{story.game_mode || 'classic'}</span>

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