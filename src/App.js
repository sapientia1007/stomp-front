import './App.css';
import React, { useEffect, useState, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from "@stomp/stompjs";
import { TbMessageChatbot } from "react-icons/tb";
import { RiSendPlane2Fill } from "react-icons/ri";

// npm install react-icons --save // 아이콘 설치 필요 

function App() {
  const stompClient = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [username, setUsername] = useState('');
  const [nicknameEntered, setNicknameEntered] = useState(false);
  const [inputCnt, setInputCnt] = useState(0);
  const [userCnt, setUserCnt] = useState(0);

  const messagesEndRef = useRef(null);
  const max_length = 200;

  const activeEnter = (e) => {
    if (e.key === 'Enter' && e.nativeEvent.isComposing === false) handleEnter(); 
    // if (e.key === 'Enter') {
    //   e.preventDefault();
    //   handleEnter();
    // }
  }

  const activeSend = (e) => {
    if (e.key === 'Enter' && e.nativeEvent.isComposing === false) sendMessage(); 
    // if (e.key === 'Enter') {
    //   e.preventDefault();
    //   sendMessage();
    // }
  }

  const handleInputChange = (event) => {
    const value = event.target.value;
    if (value.length <= max_length) {
      setInputValue(value);
      setInputCnt(value.length);
    }
  };

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  useEffect(() => {
    // const socket = new SockJS("api/coupong");
    const socket = new SockJS("https://urecacoupon.store/coupong");
    // const socket = new SockJS("http://localhost:8080/coupong");
    stompClient.current = Stomp.over(socket);

    stompClient.current.connect({}, (frame) => {
      console.log('Connected: ' + frame);

      stompClient.current.subscribe("/sub/coupong", (message) => {
        const newMessage = JSON.parse(message.body);
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        console.log(message.body);
      });

      // 사용자 수 
      stompClient.current.subscribe("/sub/usercnt", (messageCount) => {
        const count = parseInt(messageCount.body);
        setUserCnt(count);
      })
    }, (error) => {
      console.error("STOMP connection error:", error);
    });


    // 퇴장
    const handleExit = () => {
        const body = {
          name: "",
          message: "",
          createdDate: ""
        };
        console.log("Sending exit message:", body);
        stompClient.current.send("/pub/exit", {}, JSON.stringify(body), () => {
          disconnect();
        });
    };
    
    window.addEventListener('beforeunload', handleExit);

    return () => {
      window.removeEventListener('beforeunload', handleExit); 
      disconnect();
    };
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

  const sendMessage = () => {
    if (stompClient.current && inputValue && username) {
      const body = {
        name: username,
        message: inputValue,
        createdDate : ""
      };
      stompClient.current.send("/pub/messages", {}, JSON.stringify(body));
      setInputValue('');
      setInputCnt(0);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  return (
    <div>
      <div className="chat-header">
        <h1>Coupong Chat <TbMessageChatbot /></h1>
        { nicknameEntered && <div className='user-count'> {userCnt}명의 참여자</div>}
        
      </div>
      <div className="chat-container">
        {!nicknameEntered && (
          <div className="nickname-container">
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
          <>
            <div className="chat-messages">
              {messages.map((item, index) => (
                <div
                  key={index}
                  className={`chat-message ${item.name === username ? 'my-message' : 
                                            item.name === '알림' ? 'notify-message' : 'other-message'}`}
                >
                  <div className="message-content">
                    <span className="message-name">{item.name}</span>
                    <span className="message-text">{item.message}</span>
                    <span className="message-time">{item.createdDate}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-container">
              <div className="chat-input">
                <input
                  maxLength={max_length}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={(e) => activeSend(e)}
                />
                <button onClick={sendMessage}><RiSendPlane2Fill /></button>
              </div>
              <div className="chat-input-footer">
                <span className='message-length'>글자 수: {inputCnt}/{max_length}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
