const Chats = () =>{
    const getConversations = async () =>{
        try {
            const response = await fetch(`/api/conversations/fetch/${user}`);
  
  
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
}