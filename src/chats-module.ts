import {FirebaseApp, initializeApp} from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  Firestore,
} from 'firebase/firestore/lite';

class Firebase {
  firebaseConfig = {
    apiKey: 'AIzaSyAq4a8NUvcM_HYgjMVFV64LT-b9RE7ahT4',
    authDomain: 'jne-chats.firebaseapp.com',
    projectId: 'jne-chats',
    storageBucket: 'jne-chats.appspot.com',
    messagingSenderId: '31962577239',
    appId: '1:31962577239:web:5155ddd82f3854d37f2612',
    measurementId: 'G-0Y85EQWQZX',
  };

  protected app: FirebaseApp | undefined;
  protected db: Firestore | undefined;

  initDatabase() {
    this.app = initializeApp(this.firebaseConfig);
    this.db = getFirestore(this.app);
  }
}

class ChatModule extends Firebase {
  constructor() {
    super();
  }

  logo =
    '<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>';
  mainSelector = 'jne-widget-chat';
  private chatPopup: HTMLElement | null | undefined;
  private chatMessages: HTMLElement | null | undefined;
  private chatSubmit: HTMLElement | null | undefined;
  private chatInput: HTMLInputElement | null | undefined;
  private chatBubble: HTMLElement | null | undefined;
  private closePopup: HTMLElement | null | undefined;

  handle() {
    this.initDatabase();
    debugger;
    this.renderMainStyleLayout();
    this.renderMainLayout();
    this.registerEvents();
  }

  renderMainStyleLayout() {
    document.head.insertAdjacentHTML(
      'beforeend',
      '<link href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.16/tailwind.min.css" rel="stylesheet">',
    );
    const style = document.createElement('style');
    style.innerHTML = `
            .hidden {
                display: none;
            }
            .widget-container {
                position: fixed;
                bottom: 10px;
                left: 5px;
                flex-direction: column;
            }
            #chat-popup {
                height: 60vh;
                max-height: 70vh;
                transition: all 0.3s;
                overflow: hidden;
                left:5px;
            }
            .option-agent{
                color: #fff;
            }
            .notif-chat{
                background-color:red;
                color:#fff;
                padding:2px 6px;
                border-radius:20px;
                font-size:15px;
            }
            @media (max-width: 768px) {
                #chat-popup {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 100%;
                max-height: 100%;
                border-radius: 0;
                }
            }
        `;

    document.head.appendChild(style);
  }

  renderMainLayout(selector?: string) {
    const selectorId = selector || this.mainSelector;
    const chatWidgetContainer = document.createElement('div');
    chatWidgetContainer.id = selectorId;
    chatWidgetContainer.className = 'widget-container';
    document.body.appendChild(chatWidgetContainer);

    // Inject the HTML
    chatWidgetContainer.innerHTML = `
            <div id="chat-bubble" class="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center cursor-pointer text-3xl">
                ${this.logo}
            </div>
            <div id="chat-popup" class="hidden absolute bottom-20 right-0 w-96 bg-white rounded-md shadow-md flex flex-col transition-all text-sm">
                <div id="chat-header" class="flex justify-between items-center p-4 bg-blue-800 text-white rounded-t-md">
                <h3 class="m-0 text-lg">Chat With : <select class="bg-blue-800 option-agent"><option>Hume</option><option>Joko</option><option>Rohman</option><option>Indra (2)</option></select><a href=""><b class="notif-chat">2</b></a></h3>
                <button id="close-popup" class="bg-transparent border-none text-white cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                </div>
                <div id="chat-messages" class="flex-1 p-4 overflow-y-auto"></div>
                <div id="chat-input-container" class="p-4 border-t border-blue-200">
                <div class="flex space-x-4 items-center">
                    <input type="text" id="chat-input" class="flex-1 border border-blue-300 rounded-md px-4 py-2 outline-none w-3/4" placeholder="Type your message...">
                    <button id="chat-submit" class="bg-blue-800 text-white rounded-md px-4 py-2 cursor-pointer">Send</button>
                </div>
                <div class="flex text-center text-xs pt-4">
                </div>
                </div>
            </div>
        `;
  }

  togglePopup() {
    if (!this.chatPopup) throw new Error('Invalid chapPopup Component');
    this.chatPopup.classList.toggle('hidden');
    if (!this.chatPopup.classList.contains('hidden')) {
      document.getElementById('chat-input')?.focus();
    }
  }

  addChatText(message?: string) {
    // Handle user request here
    console.log('User request:', message);
    // Display user message
    const messageElement = document.createElement('div');
    messageElement.className = 'flex justify-end mb-3';
    messageElement.innerHTML = `
        <div class="bg-blue-800 text-white rounded-lg py-2 px-4 max-w-[70%]">
            ${message}
        </div>
        `;
    if (!this.chatMessages) throw new Error('Invalid chatMessage');
    this.chatMessages.appendChild(messageElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    if (!this.chatInput) throw new Error('Invalid chatInput');
    this.chatInput.value = '';

    // Reply to the user
    setTimeout(() => {
      this.reply('Hello! This is a sample reply.');
    }, 1000);
  }

  reply(message = '') {
    const replyElement = document.createElement('div');
    replyElement.className = 'flex mb-3';
    replyElement.innerHTML = `
            <div class="bg-gray-200 text-black rounded-lg py-2 px-4 max-w-[70%]">
                ${message}
            </div>
        `;
    if (!this.chatMessages) throw new Error('Invalid chatMessages');
    this.chatMessages.appendChild(replyElement);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  registerEvents() {
    if (!this.chatInput) throw new Error('Invalid chatInput');
    if (!this.chatSubmit) throw new Error('Invalid chatSubmit');
    if (!this.chatMessages) throw new Error('Invalid chatMessages');
    if (!this.chatBubble) throw new Error('Invalid chatBubble');
    if (!this.chatPopup) throw new Error('Invalid chatPopup');
    if (!this.closePopup) throw new Error('Invalid closePopup');

    this.chatInput = <HTMLInputElement>document.getElementById('chat-input');
    this.chatSubmit = document.getElementById('chat-submit');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatBubble = document.getElementById('chat-bubble');
    this.chatPopup = document.getElementById('chat-popup');
    this.closePopup = document.getElementById('close-popup');
    if (this.chatSubmit) {
      this.chatSubmit?.addEventListener('click', () => {
        const message = this.chatInput?.value.trim();
        if (!message) return;
        if (this.chatMessages)
          this.chatMessages.scrollTop = this.chatMessages?.scrollHeight;
        if (this.chatInput) this.chatInput.value = '';
        this.addChatText(message);
      });
    }

    if (this.chatInput) {
      this.chatInput.addEventListener('keyup', event => {
        if (event.key === 'Enter') {
          this.chatSubmit?.click();
        }
      });
    }

    if (this.chatBubble) {
      this.chatBubble.addEventListener('click', () => {
        this.togglePopup();
      });
    }

    this.closePopup?.addEventListener('click', () => {
      this.togglePopup();
    });
  }
}

export default ChatModule;
