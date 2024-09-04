import { Link } from "react-router-dom";
import { useContext, useEffect } from "react";
import { UserContext } from "../UserContex";

export default function Header() {
  const { setUserInfo, userInfo } = useContext(UserContext);

  useEffect(() => {
    fetch("http://localhost:4000/profile", {
      credentials: "include",
    }).then((response) => {
      response.json().then((userInfo) => {
        setUserInfo(userInfo);
      });
    });
  }, [setUserInfo]);

  function logout() {
    fetch("http://localhost:4000/logout", {
      credentials: "include",
      method: "POST",
    });
    setUserInfo(null);
  }

  const username = userInfo?.username;

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <div className="container mx-auto flex justify-between items-center p-5">
        <Link to="/" className="text-4xl font-bold hover:text-indigo-400 transition-colors">
          InspireHub
        </Link>
        <nav className="space-x-6">
          {username ? (
            <>
              <Link to="/create" className="hover:text-indigo-400 transition-colors">
                Create Post
              </Link>
              <button
                onClick={logout}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                Logout ({username})
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-400 transition-colors">
                Login
              </Link>
              <Link to="/register" className="hover:text-indigo-400 transition-colors">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}