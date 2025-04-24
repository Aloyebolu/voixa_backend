'use client'
import { useState } from "react";
import NewChat from "./NewChat";
import Message from "./Message";
const Chats = () =>{
        const user = localStorage.getItem('userId')
        const [conversation, setConversation] = useState()
        const [conversations, setConversations] = useState([null])
        const [newChatOpened, setNewChatOpend] = useState(true)
    const getConversations = async () =>{
        try {
            const response = await fetch(`api/conversations/${user}`);
  
  
            const data = await response.json();
            if (response.ok) {
                console.log(data)
                setConversations(data)
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error(error);
        }
      }
      
      return(
        <div className="mt-[60px]">


          {newChatOpened ? <NewChat /> : (

            <div>
              {
                conversation ? <Message conversation={conversation} /> :
                  (
                    <div>
                      <div className='flex justify-between'>
                        <button onClick={getConversations}>Refresh</button>
                      </div>
                      <div>
                        {!conversations[0] ? (<p className='text-red-600 text-center p-20'>No Conversation yet <br /><a className="text-blue-400" >Start a new conversation</a></p>) :

                          conversations.map((value) => (
                            
                            <div  onClick={() => setConversation(value.conversationId)} className='flex border-sky-100 bg-purple-800 mb-2 w-full text-white p-4' key={value.conversationId}>
                              <img style={{ objectFit: 'cover', width: '35px', height: '35px', borderRadius: '50%' }} src={`../api/image/${value.participantId}`} alt="user" />
                            </div>
                          ))


                        }
                      </div>


                    </div>
                  )
              }
            </div>

          )
          }
        </div>
      )
  
}

export default Chats;