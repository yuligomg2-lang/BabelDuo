import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  Download, 
  Globe, 
  MessageSquare, 
  Users, 
  User, 
  LogOut, 
  Hash, 
  Send, 
  Plus,
  Layout,
  Share2,
  Trash2,
  Key,
  Search,
  FileText
} from 'lucide-react';

export const LayoutDiagram = () => {
  const captureRef = useRef<HTMLDivElement>(null);

  const downloadImage = async () => {
    if (captureRef.current === null) return;
    
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0px',
        }
      });
      const link = document.createElement('a');
      link.download = 'maquetacion-babel-duo.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al descargar la imagen:', err);
    }
  };

  const downloadPdf = async () => {
    if (captureRef.current === null) return;

    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0px',
        }
      });

      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('maquetacion-babel-duo.pdf');
    } catch (err) {
      console.error('Error al descargar el PDF:', err);
    }
  };

  const downloadDocumentation = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentación Técnica de Interfaz - Babel Dúo</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        .container-card { transition: all 0.3s ease; }
        .container-card:hover { transform: translateY(-5px); }
    </style>
</head>
<body class="bg-slate-50 p-6 md:p-12 text-slate-800">
    <div class="max-w-5xl mx-auto">
        <header class="mb-16 text-center">
            <div class="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                Arquitectura de Software
            </div>
            <h1 class="text-5xl font-black text-slate-900 mb-4 tracking-tight">Babel Dúo: Guía de Contenedores</h1>
            <p class="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                Análisis detallado de la estructura de tres columnas diseñada para una experiencia de comunicación multilingüe fluida y profesional.
            </p>
        </header>

        <div class="grid gap-8 mb-16">
            <!-- Columna 1 -->
            <div class="container-card bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Columna 1: Navegación Global</h2>
                        <p class="text-indigo-600 font-bold text-sm">Ancho Fijo: 80px</p>
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Propósito Principal</h3>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Actúa como el eje central de control de la aplicación. Su diseño ultra-compacto garantiza que el usuario siempre tenga acceso a las funciones raíz sin importar en qué sección se encuentre.
                        </p>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Componentes Incluidos</h3>
                        <ul class="text-slate-600 text-sm space-y-2">
                            <li class="flex items-center gap-2">• Logo de identidad corporativa.</li>
                            <li class="flex items-center gap-2">• Acceso directo a Mensajería (Salas).</li>
                            <li class="flex items-center gap-2">• Directorio de Usuarios/Contactos.</li>
                            <li class="flex items-center gap-2">• Panel de Ajustes Globales.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Columna 2 -->
            <div class="container-card bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Columna 2: Gestión de Salas</h2>
                        <p class="text-indigo-600 font-bold text-sm">Ancho Fijo: 500px</p>
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Propósito Principal</h3>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Gestiona la identidad del usuario y la organización de las conversaciones. Es la zona de "preparación" donde se seleccionan los contextos de comunicación.
                        </p>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Funcionalidades Detalladas</h3>
                        <ul class="text-slate-600 text-sm space-y-2">
                            <li class="flex items-center gap-2"><strong>• Perfil:</strong> Avatar, nombre y configuración de idioma.</li>
                            <li class="flex items-center gap-2"><strong>• Acciones:</strong> Crear sala (+) y Unirse con código (Llave).</li>
                            <li class="flex items-center gap-2"><strong>• Búsqueda:</strong> Filtrado dinámico mediante barra con lupa.</li>
                            <li class="flex items-center gap-2"><strong>• Listado:</strong> Tarjetas de sala con descripción y estado.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Columna 3 -->
            <div class="container-card bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Columna 3: Área de Chat</h2>
                        <p class="text-indigo-600 font-bold text-sm">Ancho: Flexible (Ocupa el resto de la pantalla)</p>
                    </div>
                </div>
                <div class="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Propósito Principal</h3>
                        <p class="text-slate-600 text-sm leading-relaxed">
                            Es el espacio de trabajo activo. Aquí se visualizan los mensajes traducidos y se interactúa directamente con otros participantes.
                        </p>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 mb-2">Estructura Interna</h3>
                        <ul class="text-slate-600 text-sm space-y-2">
                            <li class="flex items-center gap-2"><strong>• Cabecera:</strong> Nombre de sala, descripción y botones (Compartir/Eliminar).</li>
                            <li class="flex items-center gap-2"><strong>• Mensajería:</strong> Burbujas inteligentes con scroll automático.</li>
                            <li class="flex items-center gap-2"><strong>• Entrada:</strong> Campo de texto ergonómico con botón de envío.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <section class="mb-16">
            <h2 class="text-3xl font-black text-slate-900 mb-6 tracking-tight">Especificaciones Técnicas (Tailwind CSS)</h2>
            <div class="bg-slate-900 rounded-[32px] p-8 shadow-2xl">
                <pre class="text-indigo-300 text-xs md:text-sm overflow-x-auto leading-relaxed">
&lt;!-- Estructura Principal de Babel Dúo --&gt;
&lt;div class="flex h-screen w-full overflow-hidden bg-white"&gt;
  
  &lt;!-- COL 1: NAVEGACIÓN (80px) --&gt;
  &lt;nav class="w-20 h-full border-r flex flex-col items-center py-10 bg-white"&gt;
    &lt;!-- Logo, Iconos de Navegación, Ajustes --&gt;
  &lt;/nav&gt;

  &lt;!-- COL 2: SALAS (500px) --&gt;
  &lt;aside class="w-[500px] h-full border-r flex flex-col bg-white"&gt;
    &lt;!-- Cabecera de Perfil (Nombre, Idioma, Salir) --&gt;
    &lt;!-- Controles de Sala (+, Llave) --&gt;
    &lt;!-- Buscador (Lupa) --&gt;
    &lt;!-- Lista de Chats con Scroll --&gt;
  &lt;/aside&gt;

  &lt;!-- COL 3: CHAT (FLEXIBLE) --&gt;
  &lt;main class="flex-1 h-full flex flex-col bg-slate-50"&gt;
    &lt;!-- Cabecera de Chat (Nombre, Compartir, Eliminar) --&gt;
    &lt;!-- Flujo de Mensajes (Burbujas) --&gt;
    &lt;!-- Input de Mensaje (Enviar) --&gt;
  &lt;/main&gt;

&lt;/div&gt;
                </pre>
            </div>
        </section>

        <footer class="border-t border-slate-200 pt-8 text-center text-slate-400 text-sm font-medium">
            &copy; 2026 Babel Dúo • Documentación de Arquitectura Frontend
        </footer>
    </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documentacion-maquetacion-babel-duo.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 w-full overflow-hidden">
      <div className="flex flex-wrap justify-end px-4 md:px-6 gap-3">
        <button
          onClick={downloadDocumentation}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl hover:bg-indigo-50 transition-all active:scale-95 font-bold text-xs md:text-sm"
        >
          <FileText className="w-4 h-4" />
          Documentación (HTML)
        </button>
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white border-2 border-red-600 text-red-600 rounded-2xl hover:bg-red-50 transition-all active:scale-95 font-bold text-xs md:text-sm"
        >
          <Download className="w-4 h-4" />
          Maquetación (PDF)
        </button>
        <button
          onClick={downloadImage}
          className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 active:scale-95 font-bold text-xs md:text-sm"
        >
          <Download className="w-4 h-4" />
          Maquetación (PNG)
        </button>
      </div>
      {/* This container will be captured as an image */}
      <div className="w-full overflow-x-auto custom-scrollbar pb-4">
        <div 
          ref={captureRef}
          className="bg-white p-6 rounded-[48px] border border-gray-100 font-sans min-w-[1000px]"
        >
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-widest mb-3">
              <Layout className="w-4 h-4" />
              Babel Dúo
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Diagrama de Maquetación</h1>
          </div>

          <div className="flex h-[650px] border-[8px] border-gray-50 rounded-[44px] overflow-hidden bg-white shadow-2xl relative">
            {/* Columna 1: Navegación Global (80px) */}
            <div className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-10 gap-10 relative">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <Globe className="w-6 h-6" />
              </div>
              <nav className="flex flex-col gap-8">
                <div className="p-3 text-indigo-600 bg-indigo-50 rounded-xl border border-indigo-100">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="p-3 text-gray-300">
                  <Users className="w-6 h-6" />
                </div>
              </nav>
              
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">NAV</span>
              </div>
            </div>

            {/* Columna 2: Perfil y Lista de Salas (500px) */}
            <div className="w-[320px] bg-white border-r border-gray-100 flex flex-col relative">
              {/* Cabecera de Perfil */}
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">Nombre Usuario</div>
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter opacity-60">En línea</div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg border border-indigo-100" title="Perfil / Idioma">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="p-1.5 text-red-600 bg-red-50 rounded-lg border border-red-100" title="Cerrar Sesión">
                      <LogOut className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Listado de Salas */}
              <div className="flex-1 p-5 space-y-4 overflow-hidden">
                <div className="flex justify-between items-center mb-2 px-1">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mis Salas</div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100" title="Crear Sala">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm" title="Acceder con Código">
                      <Key className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Barra de Búsqueda */}
                <div className="px-1 mb-4">
                  <div className="h-10 bg-gray-50 rounded-xl border border-gray-100 flex items-center px-3 gap-2 text-gray-400">
                    <Search className="w-4 h-4" />
                    <div className="text-[9px] font-bold uppercase tracking-widest">Buscar salas...</div>
                  </div>
                </div>

                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border ${i === 1 ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-50'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${i === 1 ? 'bg-white text-indigo-600 shadow-sm' : 'bg-gray-50 text-gray-300'}`}>
                      <Hash className="w-5 h-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className={`h-2.5 rounded-full w-3/4 ${i === 1 ? 'bg-indigo-300' : 'bg-gray-300'}`} />
                      <div className={`h-2 rounded-full w-1/2 ${i === 1 ? 'bg-indigo-200' : 'bg-gray-200'}`} />
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">SALAS</span>
              </div>
            </div>

            {/* Columna 3: Área de Chat Principal */}
            <div className="flex-1 flex flex-col bg-gray-50/50 relative">
              {/* Cabecera del Chat */}
              <div className="h-20 bg-white border-b border-gray-100 flex items-center px-8 justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base font-black text-gray-900 uppercase tracking-tight">Nombre de la Sala</div>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Descripción de la sala</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-all shadow-sm" title="Compartir">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 transition-all shadow-sm" title="Eliminar">
                    <Trash2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              {/* Flujo de Mensajes */}
              <div className="flex-1 p-10 space-y-8 overflow-hidden">
                <div className="flex justify-end">
                  <div className="w-3/4 p-5 bg-indigo-600 rounded-[32px] rounded-tr-none shadow-xl shadow-indigo-100">
                    <div className="h-2 bg-indigo-400 rounded-full w-full mb-3" />
                    <div className="h-2 bg-indigo-400 rounded-full w-4/5" />
                  </div>
                </div>
                
                <div className="flex justify-start">
                  <div className="w-3/4 p-5 bg-white rounded-[32px] rounded-tl-none border border-gray-100 shadow-lg">
                    <div className="h-2 bg-gray-200 rounded-full w-full mb-3" />
                    <div className="h-2 bg-gray-200 rounded-full w-2/3" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-1/2 p-5 bg-indigo-600 rounded-[32px] rounded-tr-none shadow-xl shadow-indigo-100">
                    <div className="h-2 bg-indigo-400 rounded-full w-full" />
                  </div>
                </div>
              </div>

              {/* Entrada de Mensaje */}
              <div className="p-8 bg-white border-t border-gray-100 flex gap-4">
                <div className="flex-1 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center px-6 text-sm font-bold text-gray-300 uppercase tracking-widest">
                  MENSAJE...
                </div>
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Send className="w-6 h-6" />
                </div>
              </div>
              
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">CHAT</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend - NOT included in the download */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 px-6">
        <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
          <h4 className="font-black text-gray-900 mb-2 uppercase text-[10px] tracking-widest">Col 1: Navegación</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Acceso global a módulos principales.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
          <h4 className="font-black text-gray-900 mb-2 uppercase text-[10px] tracking-widest">Col 2: Perfil/Salas</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Gestión de usuario, creación de salas (+), acceso por código (llave) y búsqueda.</p>
        </div>
        <div className="p-6 bg-gray-50 rounded-[32px] border border-gray-100">
          <h4 className="font-black text-gray-900 mb-2 uppercase text-[10px] tracking-widest">Col 3: Chat Principal</h4>
          <p className="text-xs text-gray-500 leading-relaxed">Área de interacción y flujo de mensajes.</p>
        </div>
      </div>
    </div>
  );
};
