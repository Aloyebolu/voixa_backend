'use client'

import { useEffect, useState } from "react"

const GetUser = (id, data) =>{
    const [user, setUser] = useState()
    
        
        useEffect(()=>{
            console.log(id)
            fetch(`../api/user/${id.id}`)
        .then((d) => d.json())
        .then((res) => {return res[data]} )
        }, [])

}
export default GetUser