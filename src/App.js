import './App.css';
import axios from "axios";
import React, { useEffect, useState, useRef, useCallback } from "react";
import SockJS from 'sockjs-client';
import { Stomp } from "@stomp/stompjs";

function App() {
  const stompClient = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [nicknameEntered, setNicknameEntered] = useState(false);
  
  const activeEnter = (e) => {
    if (e.key === 'Enter') {
      handleEnter();
    }
  }

  const activeSend = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  }

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  const connect = useCallback(() => {
    const socket = new SockJS("http://localhost:8080/coupong");
    stompClient.current = Stomp.over(socket);

    stompClient.current.connect({}, (frame) => {
      console.log('Connected: ' + frame);

      stompClient.current.subscribe("/sub/coupong", (message) => {
        const newMessage = JSON.parse(message.body);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        console.log(message.body);
      });
    }, (error) => {
      console.error("STOMP connection error:", error);
      setTimeout(connect, 1000);
    });
  }, []);

  const fetchMessages = useCallback(() => {
    return axios.get("http://localhost:8080/coupong")
      .then(response => { 
        if (Array.isArray(response.data)) {
          setMessages(response.data);
        } else {
          setMessages([]);
          console.error(response.data);
        }
      })
      .catch(error => {
        console.error(error);
      });
  }, []);


  const handleEnter = () => {
    if (stompClient.current && username) {
      const body = {
        name: username,
        message: "",
        createdDate : ""
      };
      stompClient.current.send("/pub/enter", {}, JSON.stringify(body));
      setNicknameEntered(true); 
    }
  };

const disconnect = () => {
  if (stompClient.current) {
    stompClient.current.disconnect(() => {
      console.log("Disconnected");
    });
  }
};

// 사용자 나감 처리 -> 새로고침 포함
const handleExit = () => {
  if (stompClient.current && username) { 
    const body = {
      name: username,
      message: "",
      createdDate: ""
    };
    stompClient.current.send("/pub/exit", {}, JSON.stringify(body), () => {
      stompClient.current.unsubscribe();
      disconnect();
    }); 
  }
};
  useEffect(() => {
    connect();
    fetchMessages();

    window.addEventListener('beforeunload', handleExit);

    return () => {
      window.removeEventListener('beforeunload', handleExit); 
      disconnect();
    };
  }, [connect, fetchMessages]);

  const sendMessage = () => {
    if (stompClient.current && inputValue && username) {
      const body = {
        name: username,
        message: inputValue,
        createdDate : ""
      };
      stompClient.current.send("/pub/messages", {}, JSON.stringify(body));
      setInputValue('');
    }
  };

  return (
    <div>
      {!nicknameEntered && (
        <div>
          <input
            type="text"
            placeholder="닉네임 입력"
            value={username}
            onChange={handleUsernameChange}
            onKeyDown={(e) => activeEnter(e)}
          />
          <button onClick={handleEnter}>입장</button>
        </div>
      )}
      {nicknameEntered && (
        <div className="chat-container">
          <div className="chat-input">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={(e) => activeSend(e)}
            />
            <button onClick={sendMessage}>입력</button>
          </div>
          <div className="chat-messages">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`chat-message ${item.name === username ? 'my-message' : 'other-message'}`}
              >
                <div className="message-content">
                  <span className="message-name">{item.name}</span>
                  <span className="message-text">{item.message}</span>
                  <span className="message-time">{item.createdDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
