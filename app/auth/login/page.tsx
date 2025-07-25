'use client'
import { useState } from "react";

export default function SignUp(){
    console.log(localStorage.getItem('userId'))
    localStorage.getItem('userId')? window.location.assign('../chat') : null;
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({email: '', password: ''})
    function handleInput(e){
        const target = e.target
        setFormData((prev)=>({...prev, [target.name]: target.value}))
    }
    async function handleSubmit(){
        const image = new FormData()
        image.append('audio', file)
        const res = await fetch('../api/auth/login', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData })
        })
        const data = await res.json()
        console.log(data)
        if(data.status == 'success'){
            alert('Login successfull')
            localStorage.setItem('userId', data.data.userId)
        }else{
            alert(data.message)
         }

    }
    return(
        <div className="w-screen h-screen bg-red-500 flex justify-center align-middle ">
            <div className=" p-10 bg-gray-600">
                <input name="email" onChange={handleInput} type="text" className="border border-red-400 p-2 rounded-lg my-2"/><br />
                <input name="password" onChange={handleInput} type="text" className="border border-red-400 p-2 rounded-lg my-2"/><br />
                <div className="flex justify-center w-full pt-2">
                    <button onClick={handleSubmit} className="w-full py-2 bg-blue-500 text-white font-bold rounded-lg">Submit</button>
                </div>
                
            </div>
        </div>
    )
}

