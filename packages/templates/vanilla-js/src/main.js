import './style.css'
import quapp from '/quapp.png'
import { setupCounter } from './counter.js'

document.querySelector('#app').innerHTML = `
  <div>
    <a href="" target="_blank">
      <img src="${quapp}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Quapp</h1>
    <p>Build your native apps with a snap of a finger</p>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
  </div>
`

setupCounter(document.querySelector('#counter'))
