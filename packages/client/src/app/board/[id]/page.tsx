'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useBoardStore } from '@/store/boardStore';

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const { isAuthenticated, isLoading: authLoading, loadUser } = useAuthStore();
  const {
    currentBoard,
    lists,
    cards,
    presence,
    connectionStatus,
    isLoading,
    error,
    loadBoard,
    joinBoard,
    leaveBoard,
    createList,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    updateList,
    deleteList,
  } = useBoardStore();

  const [newListTitle, setNewListTitle] = useState('');
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>({});
  const [showNewCardInput, setShowNewCardInput] = useState<Record<string, boolean>>({});
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && boardId) {
      loadBoard(boardId);
      joinBoard(boardId);
    }
    return () => {
      leaveBoard();
    };
  }, [isAuthenticated, boardId]);

  const handleAddList = async () => {
    if (!newListTitle.trim() || !boardId) return;
    await createList(newListTitle.trim(), boardId);
    setNewListTitle('');
    setShowNewListInput(false);
  };

  const handleAddCard = async (listId: string) => {
    const title = newCardTitles[listId]?.trim();
    if (!title || !boardId) return;
    await createCard(title, listId, boardId);
    setNewCardTitles((prev) => ({ ...prev, [listId]: '' }));
    setShowNewCardInput((prev) => ({ ...prev, [listId]: false }));
  };

  const handleDragStart = (cardId: string) => {
    setDragCardId(cardId);
  };

  const handleDrop = (targetListId: string) => {
    if (!dragCardId) return;
    const card = cards.find((c) => c._id === dragCardId);
    if (!card) { setDragCardId(null); return; }
    const targetCards = cards.filter((c) => c.listId === targetListId && c._id !== dragCardId);
    const newPosition = targetCards.length;
    moveCard(dragCardId, targetListId, newPosition);
    setDragCardId(null);
  };

  const getCardsForList = useCallback(
    (listId: string) => cards.filter((c) => c.listId === listId).sort((a, b) => a.position - b.position),
    [cards]
  );

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting':
      case 'reconnecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected': return 'Disconnected';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push('/dashboard')} className="btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700">
            &larr;
          </button>
          <h1 className="text-lg font-bold text-gray-900">{currentBoard?.title || 'Board'}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Presence avatars */}
          <div className="flex -space-x-2">
            {presence.slice(0, 5).map((p) => (
              <div
                key={p.userId}
                className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                title={p.userName}
              >
                {p.userName.charAt(0).toUpperCase()}
              </div>
            ))}
            {presence.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white">
                +{presence.length - 5}
              </div>
            )}
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-gray-500">{getStatusLabel()}</span>
          </div>
        </div>
      </header>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-h-0">
          {lists
            .sort((a, b) => a.position - b.position)
            .map((list) => (
              <div
                key={list._id}
                className="bg-gray-200 rounded-xl w-72 shrink-0 flex flex-col max-h-full"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(list._id)}
              >
                {/* List Header */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">{list.title}</h3>
                  <button
                    onClick={() => deleteList(list._id)}
                    className="text-gray-400 hover:text-red-500 text-sm"
                  >
                    &times;
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {getCardsForList(list._id).map((card) => (
                    <div
                      key={card._id}
                      draggable
                      onDragStart={() => handleDragStart(card._id)}
                      className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <p className="text-sm text-gray-900 font-medium">{card.title}</p>
                      {card.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {card.assigneeId && (
                          <span className="badge bg-primary-100 text-primary-700">Assigned</span>
                        )}
                        <button
                          onClick={() => deleteCard(card._id)}
                          className="text-gray-400 hover:text-red-500 text-xs ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* New card input */}
                  {showNewCardInput[list._id] && (
                    <div className="card p-2">
                      <input
                        type="text"
                        value={newCardTitles[list._id] || ''}
                        onChange={(e) => setNewCardTitles((prev) => ({ ...prev, [list._id]: e.target.value }))}
                        placeholder="Card title..."
                        className="input text-sm mb-2"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCard(list._id)}
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleAddCard(list._id)} className="btn-primary text-xs py-1 px-2">
                          Add
                        </button>
                        <button
                          onClick={() => setShowNewCardInput((prev) => ({ ...prev, [list._id]: false }))}
                          className="btn-secondary text-xs py-1 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add card button */}
                <div className="px-3 pb-2">
                  <button
                    onClick={() => setShowNewCardInput((prev) => ({ ...prev, [list._id]: true }))}
                    className="w-full text-left text-sm text-gray-500 hover:text-gray-700 py-1.5 px-2 rounded-lg hover:bg-gray-300/50 transition-colors"
                  >
                    + Add card
                  </button>
                </div>
              </div>
            ))}

          {/* Add List */}
          <div className="bg-gray-200 rounded-xl w-72 shrink-0 self-start">
            {showNewListInput ? (
              <div className="p-3">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="List title..."
                  className="input text-sm mb-2"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                />
                <div className="flex gap-1">
                  <button onClick={handleAddList} className="btn-primary text-xs py-1 px-2">
                    Add list
                  </button>
                  <button onClick={() => { setShowNewListInput(false); setNewListTitle(''); }} className="btn-secondary text-xs py-1 px-2">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewListInput(true)}
                className="w-full text-left text-sm text-gray-500 hover:text-gray-700 p-3 rounded-xl hover:bg-gray-300/50 transition-colors"
              >
                + Add another list
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}