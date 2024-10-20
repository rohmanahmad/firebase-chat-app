class Firebase {
    firebaseConfig = {
        apiKey: "AIzaSyAq4a8NUvcM_HYgjMVFV64LT-b9RE7ahT4",
        authDomain: "jne-chats.firebaseapp.com",
        databaseURL: "https://jne-chats-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "jne-chats",
        storageBucket: "jne-chats.appspot.com",
        messagingSenderId: "31962577239",
        appId: "1:31962577239:web:5155ddd82f3854d37f2612",
        measurementId: "G-0Y85EQWQZX"
    }
    initDatabase ({userid}) {
        this.app = firebase.initializeApp(this.firebaseConfig);
        /* 
        participants: {
            id: string,
            name: string,
            status: string
        }
        */
        this.participantCollection = firebase.database().ref().child('participants');
        /* 
        pending-notif: {
            [current_user_id]: {
                from_user: string,
                total: number
            }
        }
        */
        this.notifCountCollection = firebase.database().ref().child('notif-count');
        /* 
        chat-groups: {
            id: string, // perpaduan antara userid1 dan userid2
            participants: [ string[user_id:1], string[user_id:2] ] // userid didapat dari API. isi "pasti" participants adalah 2 orang
        }
        */
        this.conversationGroupsCollection = firebase.database().ref().child('conversation-groups');
        /* 
        conversations: {
            [conversation-group-id]: [
                [random-id]: {
                    date: timestamp,
                    from: string,
                    to: string,
                    message: string,
                    is_read: boolean,
                    read_at: timestamp
                }
            ]
        }
        */
        this.conversationsCollection = firebase.database().ref().child('conversations');
    }

    createGroup (groupId='', participants=[]) {
        if (!groupId) throw new Error('Invalid GroupId');
        this.conversationGroupsCollection
            .push()
            .set({id: groupId, participants})
            .then((d) => {
                console.log('new group created')
            })
            .catch(err => console.log(err));
    }

    /**
     * @getAllGroups <Promise>
     */
    getAllGroups () {
        return this.conversationGroupsCollection.get(); // mengambil data sekali
    }

    getConversationByGroupId (groupId='') {
        this.selectedGroup = this.contactsMapping.find(x => x.group_id === groupId);
        this.conversationsCollection.child(groupId).get().then(res => {
            if (!res.exists()) return this.createConversationDummy(this.selectedGroup.group_id, this.selectedGroup.participant_id, this.me.user_id);//this.setNoConversation();
            const items = res.val();
            this.renderConversation(Object.values(items));
        })
    }

    publishMessage (gId, data) {
        if (!gId) throw new Error('No GroupId Selected!');
        this.conversationsCollection.child(gId).push(data);
    }

    listenPendingNotif(currentUserId) {
        if (!currentUserId) throw new Error('Invalid UserId');
        this.notifCountCollection.child(currentUserId).on('value', (doc) => {
            if (!doc.exists()) this.notifCountCollection.child(currentUserId).set({count: 0, last_audit: new Date().getTime()});
            else {
                const item = doc.val();
                this.notificationLastAuditTime = item.last_audit;
                this.notifCount.innerHTML = item.count;
            }
        });
    }

    updateMessageIsRead (gId, items={}) {
        const currentUserId = this.me.user_id;
        for (const key in items) {
            const isRead = items[key].is_read;
            if (isRead) continue;
            this.conversationsCollection
                .child(gId)
                .child(key)
                .update({
                    is_read: true,
                    read_at: new Date().getTime()
                })
            this.notifCountCollection
                .child(currentUserId)
                .update({
                    count: firebase.database.ServerValue.increment(-1),
                    last_audit: new Date().getTime()
                });
        }
    }
}

class ChatModule extends Firebase {
    logo = '<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>';
    mainSelector = 'jne-widget-chat'
    notificationLastAuditTime = 0
    changeGroupAudio = new Audio('./assets/bell.mp3')
    sendMessageAudio = new Audio('./assets/bell2.mp3')
    unreadNotificationAudio = new Audio('./assets/bell3.mp3')
    groupNamePattern = 'g_@u1_@u2'
    participantsMockup = [/* {user_id, user_name, level, user_info} */] // (array) data "participants" from API
    participantIdsMockup = [/* user_id:1, user_id:2 */] // (arrayMap) data "participants:user_id" from API
    contactsMapping = [ // dipakai untuk comboBox chat
        // {
        //     group_id: String,
        //     participant_id: String,
        //     participant_name: String
        // }
    ]
    me = {
        user_id: null,
        user_name: null,
        level: null,
        user_info: null
    }

    constructor() {
        super()
    }

    registerAs(type='agent') {
        this.apiType = type;
        return this;
    }

    handle () {
        this.getInfo()
            .then(data => {
                const userid = data.me.user_id;
                this.setCurrentUser(data.me);
                this.setParticipantMockup(data.participants);
                this.initDatabase({userid});
                this.renderMainStyleLayout();
                this.renderMainLayout();
                this.registerEvents();
                return data.participants;
            })
            .then(_participants => {
                this.setupParticipants()
                this.listenPendingNotif(this.me.user_id);
            })
    }

    /* personals */
    setCurrentUser(userInfo={}) {
        this.me = userInfo;
    }

    setParticipantMockup (participantsData=[/* string1, string2 */]) {
        this.participantsMockup = participantsData;
        this.participantIdsMockup = participantsData.map(x => x.user_id);
    }

    /* data API */
    getInfo() {
        return fetch(`api/as-${this.apiType}.json`)
            .then(response => response.json())
    }

    /* components */
    setupParticipants() {
        this.getAllGroups()
            .then((groupData) => {
                if (groupData.exists()) {
                    const items = Object.values(groupData.val());
                    const filteredGroups = items
                        .filter(x => {
                            return x.participants.includes(this.me.user_id)
                        })
                        .map(x => {
                            const participantId = x.participants.filter(o => o !== this.me.user_id)[0];
                            x.participant_info = this.participantsMockup.find((o) => o.user_id === participantId);
                            return x
                        });
                    this.setAvailableGroups(filteredGroups);
                } else {
                    // create new group with all data reference
                    const currentUserId = this.me.user_id
                    for (const p of this.participantsMockup) {
                        const groupId = this.groupNamePattern.replace('@u1', currentUserId).replace('@u2', p.user_id);
                        this.createGroup(groupId, [currentUserId, p.user_id]);
                    }
                }
            })
    }

    /* rendering */

    renderMainStyleLayout() {
        const style = document.createElement("style");
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

    renderMainLayout(selector) {
        const selectorId = selector || this.mainSelector
        const chatWidgetContainer = document.createElement('div');
        chatWidgetContainer.id = selectorId;
        chatWidgetContainer.className = 'widget-container'
        document.body.appendChild(chatWidgetContainer);
        
        // Inject the HTML
        chatWidgetContainer.innerHTML = `
            <div id="chat-bubble" class="w-16 h-16 bg-blue-800 rounded-full flex items-center justify-center cursor-pointer text-3xl">
                ${this.logo}
            </div>
            <div id="chat-popup" class="hidden absolute bottom-20 right-0 w-96 bg-white rounded-md shadow-md flex flex-col transition-all text-sm">
                <div id="chat-header" class="flex justify-between items-center p-4 bg-blue-800 text-white rounded-t-md">
                <h3 class="m-0 text-lg">
                    Chat With : <select class="bg-blue-800 option-agent" id="contacts"></select>
                    <span class="notif-chat" id="notif-chat">2</span>
                </h3>
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

    renderContactsMapping () {
        let options = ''
        if (this.me.level !== 'agent') options += '<option value="">Select Contact</option>';
        this.contactsMapping.forEach(p => {
            options += `<option value="${p.group_id}" data-participant-id="${p.participant_id}">${p.participant_name}</option>`
        })
        this.contacts.innerHTML = options
    }

    availableContacts (groupid) {
        
    }

    renderConversation (items=[]) {
        const meId = this.me.user_id
        const contactName = this.selectedGroup.participant_name;
        this.chatMessages.innerHTML = '';
        items.forEach(doc => {
            if (doc.from === meId) this.addMessageFromMe({name: 'me', message: doc.message, date: this.formatDate(doc.date)});
            else this.addMessageFromContact({name: contactName, message: doc.message, date: this.formatDate(doc.date)});
        })
    }

    /* events */

    registerEvents () {
        const self = this;
        this.chatInput = document.getElementById('chat-input');
        this.chatSubmit = document.getElementById('chat-submit');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatBubble = document.getElementById('chat-bubble');
        this.chatPopup = document.getElementById('chat-popup');
        this.closePopup = document.getElementById('close-popup');
        this.contacts = document.getElementById('contacts');
        this.notifCount = document.getElementById('notif-chat');
        this.chatSubmit.addEventListener('click', function() {
            const message = self.chatInput.value.trim();
            if (!message) return;
            self.chatMessages.scrollTop = self.chatMessages.scrollHeight;
            self.chatInput.value = '';
            self.writeMessage(message);
        });

        this.chatInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                self.chatSubmit.click();
                // self.playSendMessageBell();
            }
        });

        this.chatMessages.addEventListener('click', function(event) {
            self.updateIsReadMessagesInGroup();
        });

        this.contacts.addEventListener('change', function (event) {
            // self.playChangeGroupBell();
            if (!event.target.value) {
                self.chatMessages.innerHTML = '<div class="text-warning-200">No Contact Selected</div>';
                return null;
            }
            self.changeGroupChat(event.target.value);
        })

        this.chatBubble.addEventListener('click', function() {
            const firstContact = self.contactsMapping[0].group_id;
            if (self.me.level === 'agent' && firstContact) self.changeGroupChat(firstContact);
            self.togglePopup();
        });

        this.closePopup.addEventListener('click', function() {
            self.togglePopup();
        });
    }

    registerEventConversationsByGroup () {
        const userid = this.me.user_id;
        const groups = this.contactsMapping.map(x => x.group_id)
        groups.forEach(gId => {
            this.conversationsCollection.child(gId).on('value', (doc) => {
                const currentDate = new Date().getTime();
                const val = doc.val();
                if (val) {
                    const items = Object.values(val)
                    if (!this.selectedGroup || (this.selectedGroup && this.selectedGroup.group_id !== gId && userid)) {
                        let total = items.filter(x => x.date > this.notificationLastAuditTime && x.is_read).length;
                        debugger
                        this.notifCountCollection.child(userid).update({
                            count: firebase.database.ServerValue.increment(total),
                            last_audit: currentDate
                        })
                        this.playUnreadNotificationBell();
                        return false;
                    }
                    if (!doc.exists()) return false;
                    this.renderConversation(items);
                }
            })
        })
    }

    /* utilities */

    randomText (length) {
        let result = '';
        const characters = 'ABCDEFGHIJKL MNOPQRSTUVWXYZ abcdefghijkl mnopqrstuvwxyz 0123456789 _ - ';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    setNoConversation () {
        this.chatMessages.innerHTML = '<div class="text-warning-200">No Conversation</div>';
    }

    togglePopup() {
        this.chatPopup.classList.toggle('hidden');
        if (!this.chatPopup.classList.contains('hidden')) {
        document.getElementById('chat-input').focus();
        }
    }

    formatDate (timestamp) {
        const m = new Date(timestamp);
        return m.getFullYear() +"-"+ (m.getMonth()+1) +"-"+ m.getDate() + " " + m.getHours() + ":" + m.getMinutes() + ":" + m.getSeconds()
    }

    playChangeGroupBell() {
        this.changeGroupAudio.play();
    }

    playSendMessageBell() {
        this.sendMessageAudio.play();
    }

    playUnreadNotificationBell() {
        this.unreadNotificationAudio.play();
    }

    /**
     * filteredGroupData adalah data yg dipakai untuk listing contacts.
     * pengecekan akan dilakukan ketika on"value" triggered.
     * jika group dari "kontak" dengan "me" tidak ada, maka otomatis akan dibuat.
     */
    setAvailableGroups (filteredGroupData=[/* {id, participants} */]) {
        if (this.contactsMapping.length === filteredGroupData.length) return null; // artinya tidak ada perubahan data
        this.contactsMapping = filteredGroupData.map(g => ({group_id: g.id, participant_id: g.participant_info.user_id, participant_name: g.participant_info.user_name}));
        const userIdsFromFilteredGroupData = filteredGroupData.map(x => x.participant_info.user_id);
        const invalidGroups = this.participantIdsMockup.filter(x => userIdsFromFilteredGroupData.indexOf(x) === -1);
        if (invalidGroups.length > 0) {
            invalidGroups.forEach(participantId => {
                const groupName = this.groupNamePattern.replace('@u1', this.me.user_id).replace('@u2', participantId);
                this.createGroup(groupName, [this.me.user_id, participantId])
            })
            this.setupParticipants();
        } else {
            console.info('No Any Invalid Group');
            this.renderContactsMapping();
            this.registerEventConversationsByGroup();
        }
    }

    changeGroupChat (groupId='') {
        this.getConversationByGroupId(groupId); // getting once
    }

    /* chats zone */
    createConversationDummy (gId, contactId, meId) {
        const data = {
            date: new Date().getTime(),
            from: meId,
            to: contactId,
            message: 'Selamat Datang...',
            is_read: false,
            read_at: '-'
        }
        this.publishMessage(gId, data)
    }

    addMessageFromMe ({name, message, date}) {
        // Handle user request here
        console.log('User request:', message);
        // Display user message
        const messageElement = document.createElement('div');
        messageElement.className = 'flex justify-end mb-3';
        messageElement.innerHTML = `
            <div class="flex items-start gap-2.5">
                <div class="flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                    <div class="flex items-center space-x-2">
                        <span class="text-base font-semibold text-gray-900 dark:text-white">${name}</span>
                    </div>
                    <p class="text-sm font-normal py-2.5 text-gray-900 dark:text-white">${message}</p>
                    <span class="text-xs font-normal text-gray-500 dark:text-gray-400">${date}</span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    
        this.chatInput.value = '';
    }

    addMessageFromContact ({name, message, date}) {
        const replyElement = document.createElement('div');
        replyElement.className = 'flex mb-3';
        replyElement.innerHTML = `
            <div class="flex items-start gap-2.5">
                <div class="flex flex-col w-full max-w-[320px] min-w-[200px] leading-1.5 p-4 border-gray-200 bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700">
                    <div class="flex items-center space-x-2 rtl:space-x-reverse">
                        <span class="text-base font-semibold text-gray-900 dark:text-white">${name}</span>
                    </div>
                    <p class="text-sm font-normal py-2.5 text-gray-900 dark:text-white">${message}</p>
                    <span class="text-xs font-normal text-gray-500 dark:text-gray-400">${date}</span>
                </div>
            </div>
        `;
        this.chatMessages.appendChild(replyElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    writeMessage (message) {
        const data = {
            date: new Date().getTime(),
            from: this.me.user_id,
            to: this.selectedGroup.participant_id,
            is_read: false,
            read_at: '-',
            message,
        }
        this.publishMessage(this.selectedGroup.group_id, data);
    }

    updateIsReadMessagesInGroup () {
        if (!this.selectedGroup) return console.log('No Group Id Selected');
        const gId = this.selectedGroup.group_id;
        this.conversationsCollection.child(gId).get().then(doc => {
            if (!doc.exists()) return null;
            const itemsObject = doc.val();
            this.updateMessageIsRead(gId, itemsObject);
        })
    }
}