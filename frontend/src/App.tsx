import FileBrowser from './components/FileBrowser';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <FileBrowser />
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
