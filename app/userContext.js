'use client'
import { createContext, useState, useEffect } from "react";
export const UserContext = createContext(null)
const UserProvider = ({children}) =>{
    const [user, setUser] = useState()
    const id = localStorage.getItem('userId')
    useEffect(()=>{
        function fetchh(){
            fetch(`../api/user/${id}`)
            .then((data)=> data.json())
            .then((res)=>setUser(res))
            
        } 
        fetchh()
    }, [])

    return <UserContext.Provider value={{user, setUser}}>{children}</UserContext.Provider>
}
export default UserProvider