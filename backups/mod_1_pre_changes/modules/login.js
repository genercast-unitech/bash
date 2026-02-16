import { auth } from '../services/auth.js';
import logo from '../assets/logo.png';

export class LoginModule {
    async init(containerId) {
        const container = document.getElementById(containerId);

        // Premium "Grupo Unitech" Design
        container.innerHTML = `
            <div class="fixed inset-0 z-50 flex items-center justify-center bg-[#050505] overflow-hidden font-sans">
                <!-- Sophisticated Ambient Background -->
                <div class="absolute inset-0 z-0">
                    <div class="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                    <div class="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-900/10 rounded-full blur-[120px] delay-1000 animate-pulse-slow"></div>
                    <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                </div>

                <!-- Glassmorphism Card -->
                <div class="relative z-10 w-full max-w-[420px] mx-4 transition-all duration-700 ease-out transform translate-y-0 opacity-100 animate-slide-up">
                    <div class="backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden ring-1 ring-white/[0.05]">
                        
                        <!-- Header Section -->
                        <div class="relative pt-10 pb-8 px-10 text-center border-b border-white/[0.05]">
                            <div class="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 shadow-inner ring-1 ring-white/10 group">
                                <img src="${logo}" alt="Logo" class="h-10 w-auto object-contain drop-shadow-lg opacity-90 group-hover:scale-110 transition-transform duration-500">
                            </div>
                            <h1 class="text-3xl font-light text-white tracking-wide mb-1">
                                Grupo <span class="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">Unitech</span>
                            </h1>
                            <p class="text-xs text-gray-500 uppercase tracking-[0.2em] font-medium">Acesso Corporativo Seguro</p>
                        </div>

                        <!-- Form Section -->
                        <div class="p-10 pt-8">
                            <form id="login-form" class="space-y-5">
                                <div class="space-y-1.5 group">
                                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-orange-500/80">Identificação Profissional</label>
                                    <div class="relative">
                                        <input type="email" id="email" 
                                            class="w-full bg-black/20 border border-white/10 text-gray-200 text-sm rounded-xl px-4 py-3.5 outline-none focus:bg-white/[0.02] focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 placeholder-gray-700 font-medium" 
                                            placeholder="usuario@unitech.com" required>
                                        <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none group-focus-within:text-orange-500/50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="space-y-1.5 group">
                                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1 transition-colors group-focus-within:text-orange-500/80">Credencial de Acesso</label>
                                    <div class="relative">
                                        <input type="password" id="password" 
                                            class="w-full bg-black/20 border border-white/10 text-gray-200 text-sm rounded-xl px-4 py-3.5 outline-none focus:bg-white/[0.02] focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 placeholder-gray-700 font-medium" 
                                            placeholder="••••••••" required>
                                         <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none group-focus-within:text-orange-500/50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div id="login-error" class="hidden p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium animate-shake">
                                    [ERRO] Credenciais inválidas. Verifique seus dados.
                                </div>

                                <button type="submit" class="group relative w-full overflow-hidden rounded-xl bg-white py-3.5 transition-all active:scale-[0.98]">
                                    <div class="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 opacity-100 transition-opacity group-hover:opacity-90"></div>
                                    <span class="relative flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                                        Entrar no Sistema
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-hover:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                    </span>
                                </button>
                            </form>
                        </div>

                        <!-- Footer / Debug Section -->
                        <div class="bg-black/20 border-t border-white/[0.05] p-6">
                            <p class="text-[10px] text-center text-gray-600 mb-4 uppercase tracking-widest font-semibold opacity-50">Ambiente de Desenvolvimento</p>
                            <div class="flex justify-center gap-2 flex-wrap">
                                 <button class="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-medium text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all" onclick="fillLogin('master@unitech.com', 'master')">Master</button>
                                 <button class="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-medium text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all" onclick="fillLogin('ceo@unitech.com', 'admin')">CEO</button>
                                 <button class="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-medium text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all" onclick="fillLogin('tech@unitech.com', 'tech')">Técnico</button>
                                 <button class="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-medium text-gray-500 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all" onclick="fillLogin('client@gmail.com', 'client')">Cliente</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity duration-300">
                       <p class="text-[10px] text-gray-500 uppercase tracking-[0.2em]">® 2026 Grupo Unitech • Sistema Corporativo v9.0</p>
                    </div>
                </div>
            </div>
            
            <style>
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.3; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes slide-up {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            </style>
        `;

        // Fill helper
        window.fillLogin = (e, p) => {
            document.getElementById('email').value = e;
            document.getElementById('password').value = p;
            // Trigger visual focus effect
            document.getElementById('email').focus();
            setTimeout(() => document.getElementById('password').focus(), 100);
        };

        const form = document.getElementById('login-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            const submitBtn = form.querySelector('button[type="submit"]');
            const btnText = submitBtn.querySelector('span');

            // Disable submit button during login
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
            const originalContent = btnText.innerHTML;
            btnText.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Autenticando...
            `;

            try {
                // Simulate slight delay for dramatic effect / perceived security check
                await new Promise(r => setTimeout(r, 600));

                const result = await auth.login(email, password);

                if (result.success) {
                    btnText.innerText = 'Acesso Concedido';
                    submitBtn.classList.remove('bg-white');
                    submitBtn.classList.add('bg-green-500');
                    setTimeout(() => window.location.reload(), 300);
                } else {
                    errorDiv.textContent = `[!] ${result.message}`;
                    errorDiv.classList.remove('hidden');
                    form.classList.add('animate-shake');
                    setTimeout(() => form.classList.remove('animate-shake'), 500);

                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                    btnText.innerHTML = originalContent;
                }
            } catch (error) {
                console.error(error);
                errorDiv.textContent = 'Erro de conexão com o servidor seguro.';
                errorDiv.classList.remove('hidden');

                // Reset button
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                btnText.innerHTML = originalContent;
            }
        });
    }
}
