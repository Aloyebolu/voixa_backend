// export default function ChatPage() {
//     // const {user} = useContext(UserContext)
//     const user = localStorage.getItem('userId')

//     // const participants = [user, 'bf7b3c90-caf4-45a3-9082-4b82295b795f']
    


//     const [messages, setMessages] = useState([])

//     const [message, setMessage] = useState('')


//     const getConversations = async () =>{
//       try {
//           const response = await fetch('/api/conversations/fetch', {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify(user),
//           });


//           const data = await response.json();
//           if (response.ok) {
//               console.log(data)
//               setConversations(data)
//           } else {
//               alert('Error: ' + data.message);
//           }
//       } catch (error) {
//           console.error(error);
//       }
//     }

//     
//     
//     return (
//         <div>
          
//             <div className='flex justify-between'>
//               <h2>Conversations</h2>
//               <button onClick={getConversations}>Refresh</button>
//             </div>
//             <div>
//               {!conversations[0] ? (<p className='text-red-600 text-center p-20'>No Conversations here</p>) : 
              
//               conversations.map((value)=>(
//                 <div onClick={()=>setConversation(value.conversationId)} className='flex border-sky-100 bg-purple-800 mb-2 w-full text-white p-4' key={value}>
//               <img style={{objectFit: 'cover', width: '35px', height: '35px', borderRadius: '50%'}}  src={`api/image/${value.participantId}`} alt="user" />
//                   </div>
//               ))
            

//               }
//             </div>
//             <hr />
//             <div>
//               <div className='flex justify-between'>
//                 Conversation Messages<button onClick={refreshMessages}>Refresh</button>
//               </div>
//               <div>
//                 {
//                   !messages ? (<p className='text-red-600 text-center p-20'>No Conversations here</p>) : 
//                   messages.map((value)=>(
//                     <div className={value.sender_id===user? 'text-blue-600' : 'text-red-600'} key={value.id}>{value.message}</div>
//                   ))
//                 }
//               </div>
              
//             </div>
            
//             <div className='absolute bottom-0 w-full'>
//               <div>
//                 <input type="text" onChange={(e)=>setMessage(e.target.value)}/>
//                 <button onClick={sendMessage} className='border-2 bg-blue-600 p-2 '>Send</button>
//               </div>
//             </div>
//         </div>

//     );
// }
'use client'
import Chats from "../components/Chats";
// import { useState } from "react"
import Header from "../components/Header";
 const Page = () =>{
  // const [page, setPage] = useState('chats');

  return(
    <div className="width-1 overflow-hidden">
      <Header page='home' />
      <Chats />
    </div>
    
  )
}
export default Page