import './style.css'
// import UserProvider, { UserContext } from '../utils/userContext'
// import { useContext } from 'react'
function Header(page : string){
    // const {user, setUser} = useContext(UserContext)
    // setUser(user)
    // const user = localStorage.getItem('userId')
    // console.log(user.name)
    return(
        <div className="z-10 bg-slate-600 pb-3 fixed w-screen">
            <div className="flex justify-end p-2 py-1" >
                {/* <h1 className="name">{user.name && 'hi'}</h1> */}
                <div>
                    {/* <img className="profile" src={`../api/image/${user.id}`} alt="user" /> */}
                    {/* <button onClick={logOut}>LogOut</button> */}
                    {/* <GetUser id={user} data='name' /> */}
                </div>

            </div>
            <div className="a flex justify-between p-2  text-white">
                <div className={`a ${page == 'home' ? 'active' : ''}`}>Home</div>
                <div className="a">Chats</div>
                <div className="a">Groups</div>
                <div className="a">Settings</div>
            </div>
        </div>
        
    )
}

export default Header