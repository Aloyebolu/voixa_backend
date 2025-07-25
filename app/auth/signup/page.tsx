'use client'
import { useState } from "react";

export default function SignUp(){
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({name: '', email: '', password: '',})
    function handleInput(e){
        const target = e.target
        setFormData((prev)=>({...prev, [target.name]: target.value}))
    }
    async function handleSubmit(){
        const image = new FormData()
        image.append('audio', file)
        const res = await fetch('../api/auth/signup', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData })
        })
        const data = await res.json()
        console.log(data)
        image.append('json', JSON.stringify(data.userId))

        const res2 = await fetch("../api/image", {
            method: "POST",
            body: image,
        })
    
        console.log(await res2.json())
        console.log(formData)

    }
    return(
        <div className="w-screen h-screen bg-red-500 flex justify-center align-middle ">
            <div className=" p-10 bg-gray-600">
                <input name="name" onChange={handleInput} type="text" className="border border-red-400 p-2 rounded-lg my-2"/><br />
                <input name="email" onChange={handleInput} type="text" className="border border-red-400 p-2 rounded-lg my-2"/><br />
                <input name="password" onChange={handleInput} type="text" className="border border-red-400 p-2 rounded-lg my-2"/><br />
                <input type="file" name="file" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
                <div className="flex justify-center w-full pt-2">
                    <button onClick={handleSubmit} className="w-full py-2 bg-blue-500 text-white font-bold rounded-lg">Submit</button>
                </div>
                
            </div>
        </div>
    )
}

