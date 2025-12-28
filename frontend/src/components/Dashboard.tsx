import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Users as UsersIcon, Gamepad, Link as LinkIcon, LogOut, Menu, X } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import AIConfig from './AIConfig';
import Users from '../pages/Users';
import Games from '../pages/Games';

interface DashboardProps {
    user: any;
    onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
    const [activeMenu, setActiveMenu] = useState('ai');
    const [whatsappStatus, setWhatsappStatus] = useState<any>({ status: 'DISCONNECTED' });
    const [phone, setPhone] = useState('');
    const [loadingCode, setLoadingCode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/whatsapp/status`);
                setWhatsappStatus(response.data);
            } catch (err) {
                console.error('Error fetching whatsapp status');
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestPairing = async () => {
        if (!phone) return;
        setLoadingCode(true);
        try {
            await axios.post(`${API_BASE_URL}/whatsapp/request-pairing`, { phone });
            // Status will be updated by the interval
        } catch (err) {
            console.error('Error requesting pairing code');
            alert('Falha ao gerar código. Verifique se o backend está pronto.');
        } finally {
            setLoadingCode(false);
        }
    };

    const renderContent = () => {
        switch (activeMenu) {
            case 'ai':
                return <AIConfig />;
            case 'users':
                return <Users />;
            case 'games':
                return <Games />;
            case 'whatsapp':
                return (
                    <div className="card">
                        <h2>Conectar App</h2>
                        <div style={{ marginTop: '1rem' }}>
                            <p>Status: <span className={`status-badge status-${whatsappStatus.status.toLowerCase()}`}>{whatsappStatus.status}</span></p>

                            {whatsappStatus.status !== 'CONNECTED' && (
                                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                                    <h3>Opção 1: Pareamento por Código</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Digite seu número com DDI e DDD (ex: 5511999999999) para receber um código de 8 dígitos.</p>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder="5511999999999"
                                            className="form-input"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            style={{ margin: 0 }}
                                        />
                                        <button
                                            className="btn"
                                            style={{ width: 'auto' }}
                                            onClick={handleRequestPairing}
                                            disabled={loadingCode || !phone}
                                        >
                                            {loadingCode ? 'Gerando...' : 'Gerar Código'}
                                        </button>
                                    </div>

                                    {whatsappStatus.pairingCode && (
                                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                            <p>Seu código de pareamento:</p>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.5rem', margin: '1rem 0', color: 'var(--primary)' }}>
                                                {whatsappStatus.pairingCode}
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No seu WhatsApp: Configurações &gt; Dispositivos Conectados &gt; Conectar um dispositivo &gt; Conectar com número de telefone.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {whatsappStatus.qrCode && (
                                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                    <h3>Opção 2: Escanear QR Code</h3>
                                    <p style={{ marginBottom: '1rem' }}>Escaneie o QR Code abaixo:</p>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(whatsappStatus.qrCode)}`}
                                        alt="WhatsApp QR Code"
                                        style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return <div>Dashboard</div>;
        }
    };

    return (
        <div className="dashboard-container">
            <button
                className="mobile-toggle"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle Menu"
            >
                {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h1 className="sidebar-title">Ana Bot</h1>
                </div>
                <nav style={{ flex: 1 }}>
                    <a href="#" className={`nav-item ${activeMenu === 'ai' ? 'active' : ''}`} onClick={() => { setActiveMenu('ai'); setIsSidebarOpen(false); }}>
                        <Settings size={20} /> Configurar AI
                    </a>
                    <a href="#" className={`nav-item ${activeMenu === 'users' ? 'active' : ''}`} onClick={() => { setActiveMenu('users'); setIsSidebarOpen(false); }}>
                        <UsersIcon size={20} /> Usuários
                    </a>
                    <a href="#" className={`nav-item ${activeMenu === 'games' ? 'active' : ''}`} onClick={() => { setActiveMenu('games'); setIsSidebarOpen(false); }}>
                        <Gamepad size={20} /> Jogos
                    </a>
                    <a href="#" className={`nav-item ${activeMenu === 'whatsapp' ? 'active' : ''}`} onClick={() => { setActiveMenu('whatsapp'); setIsSidebarOpen(false); }}>
                        <LinkIcon size={20} /> WhatsApp
                    </a>
                </nav>
                <div style={{ marginTop: 'auto', borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>Olá, {user.name}</div>
                    <a href="#" className="nav-item" onClick={onLogout} style={{ color: '#ef4444' }}>
                        <LogOut size={20} /> Sair
                    </a>
                </div>
            </aside>
            <main className="main-content">
                {renderContent()}
            </main>
        </div>
    );
};

export default Dashboard;
