import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit, X } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const Users: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // States for Edit Modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/users`);
            setUsers(response.data);
        } catch (err) {
            console.error('Error fetching users');
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (id: number) => {
        if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert('Erro ao deletar usuário');
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setNewName(user.name || '');
        setNewPassword(''); // Password starts empty (only change if typed)
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, {
                name: newName,
                password: newPassword || undefined // Only send if not empty
            });
            alert('Usuário atualizado com sucesso!');
            closeEditModal();
            fetchUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            alert('Erro ao atualizar usuário');
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>Gerenciar Usuários</h2>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '0.75rem' }}>Login</th>
                        <th style={{ padding: '0.75rem' }}>Nome</th>
                        <th style={{ padding: '0.75rem' }}>Nível</th>
                        <th style={{ padding: '0.75rem' }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem' }}>{user.login}</td>
                            <td style={{ padding: '0.75rem' }}>{user.name}</td>
                            <td style={{ padding: '0.75rem' }}>{user.level}</td>
                            <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn"
                                    style={{ padding: '0.4rem', width: 'auto', backgroundColor: '#94a3b8' }}
                                    onClick={() => openEditModal(user)}
                                >
                                    <Edit size={16} />
                                </button>
                                {!user.isAdmin && (
                                    <button className="btn" style={{ padding: '0.4rem', width: 'auto', backgroundColor: 'var(--danger)' }} onClick={() => deleteUser(user.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="modal-title">Editar Usuário: {editingUser?.login}</h3>
                            <button onClick={closeEditModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateUser}>
                            <div className="form-group">
                                <label className="form-label">Nome</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Nova Senha (deixe em branco para não alterar)</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
