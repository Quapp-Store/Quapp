import './style.css'
import quapp from "/quapp.png"
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="" target="_blank">
      <img src="${quapp}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Quapp</h1>
    <p>Create apps with a Snap of your Fingers</p>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
