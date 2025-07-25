'use state'

import { useCallback, useContext, useEffect, useState } from "react"
import './style.css'
// import { UserContext } from "../utils/userContext"
// export const UserContext = createContext(null)
// import { getMessageById } from "../utils/helperFunctions"

const Message = (conversation: { conversation: any }) => {
    // const {user, setUser} = useContext(UserContext)
    const user = localStorage.getItem('userId')
    const [user2, setUser2] = useState()
    const [conversationParticipants, setConversationParticipants] = useState()
    type MessageType ={
        id: string;
        message: string;
        sender_id: string;
        reply?: string;
        reaction?: object;
    }
    type MessageMap = {
        [key : string]: MessageType
    }
    const [messages, setMessages] = useState<MessageMap>({})
    const [message, setMessage] = useState('')
    const [selectedMessage, setSelectedMessage] = useState<string |null | false>(null)
    const [reply, setReply] = useState<string | null>(null);
    const [edit, setEdit] = useState<string | null>(null)
    // const user = localStorage.getItem('userId')
    conversation = conversation.conversation

    //Get all messages from the database at once
    const refreshMessages = useCallback(async () => {
        try {
            const response = await fetch(`/api/messages/fetch/${conversation}`);


            const data = await response.json();
            if (response.ok) {
                console.log(data)
                setMessages(data)
            } else {
            }
        } catch (error) {
            console.error(error);
        }
    }, [conversation]);



    //This useEffect helps to gather information and update it to their states
    useEffect(() => {
        refreshMessages()

        console.log(conversation)
        fetch(`../../api/conversations/participants/${conversation}`)
        .then((data)=>data.json())
        .then((res)=>setConversationParticipants(res))

        // fetch(`api/user/${id}`)
        // .then((data) => data.json())
        // .then((res) => { return res; })
    }, [conversation, refreshMessages])



    //A useEffect to update the state of messages after an update, delete, or insert
    useEffect(() => {
        const host = 'localhost'
        const ws = new WebSocket(`ws://${host}:4000`);
      console.log('a'+messages)
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          
      
          if (message.type === 'insert') {
            console.log('🆕 Color added:', message.data);
            setMessages(prev => ({
                ...prev,
                [message.data.id] : message.data
            }))
            setSelectedMessage(null)
          } else if (message.type === 'update') {
            console.log('♻️ Color updated:', message.data);
            setMessages(prev => ({
                ...prev,
                [message.data.id] : message.data
            }))
          } else if (message.type === 'delete') {
            console.log('❌ Color deleted:', message.data);
            setMessages(prev =>prev.filter(item=> item.id !==message.data.id))
          }
        };
      
        return () => ws.close();
      }, []);

    //Function to send Messages
    async function sendMessage(){
        console.log(message)
        console.log(conversation)
        if(edit){
            fetch('../../api/messages', {
                method: 'put',
                headers: {'Content-type' : 'application/json'},
                body: JSON.stringify([edit, message])
            }).then((data) => data.json())
            .then((res) => console.log(res))
            .catch((err) => console.log(err))
        }else{
            try {
                const response = await fetch('/api/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId: conversation, senderId: user, message, reply: reply?messages[reply].id :null }),
                });


                const data = await response.json();
                if (response.ok) {
                    console.log(data)
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error(error);
            }
        }
        setReply(null)
        setEdit(null)
        setMessage('')
    }
    // Functions to update message state
    function likeMessage(messageId : string){
        fetch('../../api/messages/react', {
            method: 'put',
            headers: {'Content-type' : 'application/json'},
            body: JSON.stringify([messageId, '👍'])
        }).then((data) => data.json())
        .then((res) => console.log(res))
        .catch((err) => console.log(err))

        console.log(messages)
        // Close the modal
        setSelectedMessage('')


    }
    function replyMessage(messageId : string){
        setReply(messageId)
        setSelectedMessage(null)
    }
    function editMessage(messageId : string){

        setEdit(selectedMessage)
        setSelectedMessage(false)
        console.log(selectedMessage)
    }
    function deleteMessage(messageId : string){
        fetch('../../api/messages', {
            method: 'delete',
            headers: {'Content-type' : 'application/json'},
            body: JSON.stringify(messageId)
        }).then((data) => data.json())
        .then((res) => console.log(res))
        .catch((err) => console.log(err))
    
        //Close the modal
        setSelectedMessage(null)
    }
    function warnMessage(messageId : string){  
        console.log(messageId)
        setSelectedMessage(null)
    }
    //A function that gets a message details by its id.
    //It checks the messages array for the particuolar messsage
     return (
        <div>
            <div>
                {
                    !messages ? (<p className='text-red-600 text-center p-20'>No Conversations here</p>) :
                        Object.entries(messages).map( ([id, value]) => (

                            
                            <div key={id} className="message">
                                
                                



                                {value.sender_id === user.id ? (
                                    <div className="m2">
                                        <div className="user-message" onClick={()=>setSelectedMessage(value.id)} >
                                            {value.reply ? (
                                                <div>
                                                    <div className="reply-a">
                                                        {messages[value.reply].message}
                                                    </div>
                                                    {value.message}
                                                    
                                                </div>
                                            ) : (
                                                value.message
                                            )}
                                            {selectedMessage === value.id ? (
                                                <div>
                                                    <div className="modal">
                                                        <div><button onClick={() => likeMessage(selectedMessage)}>Like</button></div>
                                                        <hr />
                                                        <div><button onClick={() => replyMessage(selectedMessage)}>Reply</button></div>
                                                        <hr />
                                                        <div><button onClick={() => deleteMessage(selectedMessage)}>Delete</button></div>
                                                        <hr />
                                                        <div><button onClick={() => warnMessage(selectedMessage)}>Warn</button></div>
                                                        <hr />
                                                        <div><button onClick={editMessage}>Edit</button></div>
                                                        <hr />
                                                    </div>
                                                </div>
                                            ) : (<></>)}
                                        </div>
                                    <div className="triangle-b"></div>
                                    {
                                        value.reaction?(<div className="like z-10">👍</div>) : ''
                                    }
                                    


                                    </div>
                                ) : (
                                        <div className="flex">
                                            <div className="triangle-a absolute"></div>
                                            <div onClick={()=>setSelectedMessage(value.id)}  className="sender-message relative">

                                                {value.reply ? (
                                                    <div>
                                                        <div className="reply-b">
                                                            {messages[value.reply].message}
                                                        </div>
                                                        {value.message}
                                                    </div>
                                                ) : (
                                                    value.message
                                                )}

                                                {selectedMessage == value.id ? (
                                                    <div>
                                                        <div className="modal">
                                                            <div><button onClick={() => likeMessage(selectedMessage)}>Like</button></div>
                                                            <hr />
                                                            <div><button onClick={() => replyMessage(selectedMessage)}>Reply</button></div>
                                                            <hr />
                                                            <div><button onClick={() => deleteMessage(selectedMessage)}>Delete</button></div>
                                                            <hr />
                                                            <div><button onClick={() => warnMessage(selectedMessage)}>Warn</button></div>
                                                            <hr />
                                                            <hr />
                                                        </div>
                                                    </div>
                                ) : (<></>)}
                                            </div>
                                        </div>
                                
                                )}
                                

                            </div>
                        ))
                }
            </div>


            <div className='down invert absolute bottom-0 w-full'>

                 <div>
                     <div className="input">
                         {

                             reply !== null ? (<div className="reply-ind">{messages[reply].message}</div>) : ''
                         }
                         {

                             edit !== null ? (
                             <div className="edit-ind">
                                  {messages['e5bfae25-0e7d-4d3b-a7ad-a366cb85a813'].id}
                             </div>) : ''
                         }
                         <input value={message} className="w-full h-full m-0 bg-transparent" type="text" onChange={(e) => setMessage(e.target.value)} />

                     </div>
                     <button onClick={sendMessage} className='border-2 bg-blue-600 p-2 '>Send</button>
                 </div>
            </div>

            
           
        </div>
        // <div>
        // </div>

    )
}
export default Message