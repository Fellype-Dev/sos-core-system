import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-xl border border-slate-100 shadow-lg max-w-md mx-auto my-12">
      <h1 className="text-7xl font-extrabold tracking-tight text-indigo-600 mb-2">404</h1>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Página não encontrada</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-xs leading-relaxed">
        A página que você está tentando acessar não existe ou foi movida para outro endereço.
      </p>
      <Link 
        to="/" 
        className="inline-flex items-center justify-center h-10 px-6 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
      >
        Voltar para o início
      </Link>
    </div>
  );
}

export default NotFound;
