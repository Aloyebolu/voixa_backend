'use client'
import Header from "./Header";
import { useState } from "react";
import './style.css'

const NewChat = () =>{
    const user = localStorage.getItem('userId')
    const [participants, setParticipants] = useState([user]);
    const [loading, setLoading] = useState(false);
    const startConversation = async () => {
        setLoading(true);
        try {
          console.log(participants)
            const response = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'private', participants }),
            });


            const data = await response.json();
            if (response.ok) {
                alert('Conversation Created: ' + data.conversationId);
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };
    return(
        <div className="p-2 flex flex-col h-screen absolute top-0 z-10" style={{alignItems: 'center', justifyContent: 'center', zIndex: 10}}>
            <div className='flex justify-between p-4'>
                <h1>New Chat</h1>
                {/* <div>
              <img style={{objectFit: 'cover', width: '30px', height: '30px', borderRadius: '50%'}}  src={`../api/image/${user}`} alt="user" />
              <button onClick={logOut}>LogOut</button>
            </div> */}

            </div>

            <input
            className="add-input"
                type="text"
                placeholder="Enter User ID"
                onChange={(e) => setParticipants([participants[0], e.target.value])}
            />
            <button className="add-button" onClick={startConversation} disabled={loading}>
                {loading ? (<div className="round animate animate-spin" ></div>) : 'Start Chat'}
            </button>
        </div>

    )
}

export default NewChat
{(() => {
    const replyName = messages?.[item.reply] 
    ? participants?.[messages[item.reply].sender_id]?.name || null
    : null;
    return (
      <View>
        
        <TouchableOpacity onLongPress={() => setSelectedMessage(item.id)}>
          <MessageBubble
            item={item}
            reply={messages?.[item.reply]?.message || null}
            replyName={replyName}

          />

        </TouchableOpacity>        
        <Modal
          transparent
          visible={selectedMessage == item.id}
          animationType="slide"
          onRequestClose={() => setSelectedMessage(false)}
        >
          <TouchableOpacity
            style={styles.overlay}
            onPress={() => setSelectedMessage(false)}
          >
            <View style={styles.popup}>
              <TouchableOpacity onPress={() => replyMessage(item.id)}>
                <Text style={styles.option}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => editMessage(item.id)}>
                <Text style={styles.option}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteMessage(item.id)}>
                <Text style={styles.option}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => copy(item.message)}>
                <Text style={styles.option}>Copy</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  })()}