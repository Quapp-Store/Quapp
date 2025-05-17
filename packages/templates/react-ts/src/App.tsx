import quappLogo from '/quapp.png';
import './App.css';

const App: React.FC = () => {
  return (
    <>
      <div>
        <img src={quappLogo} className="logo" alt="Quapp logo" />
      </div>
      <h1>Quapp</h1>
      <p>Build your Native apps With a Snap of a Finger</p>
      <div className="card">
        <p>
          Edit <code>src/App.tsx</code> to see changes in your app.
        </p>
      </div>
    </>
  );
};

export default App;