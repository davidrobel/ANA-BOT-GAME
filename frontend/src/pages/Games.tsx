import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, Plus } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const Games: React.FC = () => {
    const [games, setGames] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGame, setEditingGame] = useState<any>(null);

    useEffect(() => {
        fetchGames();
    }, []);

    const fetchGames = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/games`);
            setGames(response.data);
        } catch (err) {
            console.error('Error fetching games');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData();

        formData.append('name', (form.elements.namedItem('name') as HTMLInputElement).value);
        formData.append('prompt', (form.elements.namedItem('prompt') as HTMLTextAreaElement).value);
        formData.append('solution', (form.elements.namedItem('solution') as HTMLTextAreaElement).value);

        const imageFile = (form.elements.namedItem('image-file') as HTMLInputElement).files?.[0];
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (editingGame?.image) {
            formData.append('image', editingGame.image);
        }

        try {
            if (editingGame) {
                await axios.put(`${API_BASE_URL}/games/${editingGame.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await axios.post(`${API_BASE_URL}/games`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setIsModalOpen(false);
            setEditingGame(null);
            fetchGames();
        } catch (err) {
            alert('Erro ao salvar jogo');
        }
    };

    const deleteGame = async (id: number) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/games/${id}`);
            fetchGames();
        } catch (err) {
            alert('Erro ao deletar');
        }
    };

    const getImageUrl = (imagePath: string) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        const baseUrl = API_BASE_URL.replace('/api', '');
        return `${baseUrl}${imagePath}`;
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Gerenciar Jogos</h2>
                <button className="btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => { setEditingGame(null); setIsModalOpen(true); }}>
                    <Plus size={18} /> Novo Jogo
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {games.map(game => (
                    <div key={game.id} className="card" style={{ margin: 0, border: '1px solid var(--border)' }}>
                        {game.image && <img src={getImageUrl(game.image) || ''} alt={game.name} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '1rem' }} />}
                        <h3 style={{ marginBottom: '0.5rem' }}>{game.name}</h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><b>Pergunta:</b> {game.prompt}</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><b>Solução:</b> {game.solution}</p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ padding: '0.4rem', backgroundColor: '#94a3b8' }} onClick={() => { setEditingGame(game); setIsModalOpen(true); }}>
                                <Edit size={16} />
                            </button>
                            <button className="btn" style={{ padding: '0.4rem', backgroundColor: 'var(--danger)' }} onClick={() => deleteGame(game.id)}>
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3>{editingGame ? 'Editar Jogo' : 'Novo Jogo'}</h3>
                        <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Nome do Jogo</label>
                                <input type="text" name="name" className="form-input" defaultValue={editingGame?.name || ''} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Imagem Ilustrativa</label>
                                <input type="file" name="image-file" className="form-input" accept="image/*" />
                                {editingGame?.image && <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Atual: {editingGame.image}</p>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Enigma (O que o usuário vê)</label>
                                <textarea name="prompt" className="form-input" rows={4} defaultValue={editingGame?.prompt || ''} required placeholder="Descreva o mistério que os jogadores devem resolver..."></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Solução (O que a IA considera para validar)</label>
                                <textarea name="solution" className="form-input" rows={4} defaultValue={editingGame?.solution || ''} required placeholder="Explique a solução completa aqui para que a IA possa julgar as perguntas..."></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn">Salvar</button>
                                <button type="button" className="btn" style={{ backgroundColor: '#94a3b8' }} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Games;
