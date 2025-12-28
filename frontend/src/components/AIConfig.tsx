import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

const AIConfig: React.FC = () => {
    const [configs, setConfigs] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('chatgpt');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Controlled form state
    const [formData, setFormData] = useState({
        apiKey: '',
        baseUrl: 'http://localhost:11434',
        model: 'gpt-4o',
        prompt: '',
        isActive: false
    });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/ai`);
            setConfigs(response.data);
            updateFormForProvider(activeTab, response.data);
        } catch (err) {
            console.error('Error fetching AI configs');
        }
    };

    const updateFormForProvider = (provider: string, allConfigs: any[]) => {
        const config = allConfigs.find(c => c.provider === provider);
        if (config) {
            setFormData({
                apiKey: config.apiKey || '',
                baseUrl: config.baseUrl || (provider === 'ollama' ? 'http://localhost:11434' : ''),
                model: config.model || (provider === 'chatgpt' ? 'gpt-4o' : 'llama3'),
                prompt: config.prompt || '',
                isActive: config.isActive || false
            });
        } else {
            setFormData({
                apiKey: '',
                baseUrl: provider === 'ollama' ? 'http://localhost:11434' : '',
                model: provider === 'chatgpt' ? 'gpt-4o' : 'llama3',
                prompt: '',
                isActive: false
            });
        }
    };

    const handleTabChange = (provider: string) => {
        setActiveTab(provider);
        updateFormForProvider(provider, configs);
        setMessage('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const data = {
            provider: activeTab,
            ...formData
        };

        try {
            await axios.post(`${API_BASE_URL}/ai`, data);
            setMessage('Configuração salva com sucesso!');
            // Refresh local configs list
            const response = await axios.get(`${API_BASE_URL}/ai`);
            setConfigs(response.data);
        } catch (err) {
            setMessage('Erro ao salvar configuração. Verifique a conexão com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Configurar AI</h2>
            <div className="tabs">
                <div className={`tab ${activeTab === 'chatgpt' ? 'active' : ''}`} onClick={() => handleTabChange('chatgpt')}>ChatGPT</div>
                <div className={`tab ${activeTab === 'ollama' ? 'active' : ''}`} onClick={() => handleTabChange('ollama')}>Ollama</div>
            </div>

            {message && (
                <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: message.includes('Erro') ? '#fee2e2' : '#dcfce7',
                    color: message.includes('Erro') ? '#991b1b' : '#166534',
                    marginBottom: '1rem'
                }}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        type="checkbox"
                        name="isActive"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                    />
                    <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0 }}>Ativar este agente</label>
                </div>

                {activeTab === 'chatgpt' ? (
                    <div className="form-group">
                        <label className="form-label">API Key (OpenAI)</label>
                        <input
                            type="password"
                            name="apiKey"
                            className="form-input"
                            value={formData.apiKey}
                            onChange={handleInputChange}
                            placeholder="sk-..."
                        />
                    </div>
                ) : (
                    <div className="form-group">
                        <label className="form-label">Base URL (IP:Porta)</label>
                        <input
                            type="text"
                            name="baseUrl"
                            className="form-input"
                            value={formData.baseUrl}
                            onChange={handleInputChange}
                            placeholder="http://192.168.1.171:11434"
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Modelo</label>
                    <input
                        type="text"
                        name="model"
                        className="form-input"
                        value={formData.model}
                        onChange={handleInputChange}
                        placeholder={activeTab === 'chatgpt' ? 'gpt-4o' : 'llama3'}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Prompt do Sistema</label>
                    <textarea
                        name="prompt"
                        className="form-input"
                        rows={10}
                        value={formData.prompt}
                        onChange={handleInputChange}
                        placeholder="Instruções para a IA..."
                    ></textarea>
                </div>

                <button type="submit" className="btn" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Configuração'}
                </button>
            </form>
        </div>
    );
};

export default AIConfig;
