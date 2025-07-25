export const  getMessageById = async <T>(id: string): Promise<T | null> =>{
    
    try{
        const response = await fetch(`http://localhost:3000/api/messages/${id}`)
        return await response.json()
    }catch(error){
        console.log(error)
        return null
    }
}