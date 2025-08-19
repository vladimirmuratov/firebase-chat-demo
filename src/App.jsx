import React, { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getFirestore,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
} from 'firebase/auth';
import { useAutoScroll } from './lib/useAutoScroll';

// ⚡ Вставь свой конфиг
const firebaseConfig = {
    apiKey: import.meta.env.VITE_APIKEY,
    authDomain: import.meta.env.VITE_AUTHDOMAIN,
    projectId: import.meta.env.VITE_PROJECTID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export default function App() {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState('');
    const listRef = useRef(null);

    let lastDate = null;

    useAutoScroll(listRef, [messages]);

    const formatDateHeader = (date) => {
        const now = new Date();
        const d = new Date(date);

        const isToday =
            d.getDate() === now.getDate() &&
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear();

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);

        const isYesterday =
            d.getDate() === yesterday.getDate() &&
            d.getMonth() === yesterday.getMonth() &&
            d.getFullYear() === yesterday.getFullYear();

        if (isToday) return 'Сегодня';
        if (isYesterday) return 'Вчера';

        return d.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
    };


    // Отслеживаем авторизацию
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    // Подписка на все сообщения
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    // Отправка нового сообщения
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || !user) return;

        await addDoc(collection(db, 'messages'), {
            text: input,
            uid: user.uid,
            name: user.displayName || user.email,
            photo: user.photoURL || null,
            createdAt: serverTimestamp(),
        });

        setInput('');
    };

    // Сохранение редактированного сообщения
    const handleEditSave = async (id) => {
        const ref = doc(db, 'messages', id);
        await updateDoc(ref, { text: editingText });
        setEditingId(null);
        setEditingText('');
    };

    // Удаление сообщения
    const handleDelete = async (id) => {
        const ref = doc(db, 'messages', id);
        await deleteDoc(ref);
    };

    // Google вход
    const handleGoogleLogin = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    // Email регистрация/вход
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    };

    // Выход
    const handleLogout = async () => {
        await signOut(auth);
    };

    // Если пользователь не вошёл
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold">🔥 Firebase Chat Demo</h1>

                {/* Google вход */}
                <button
                    onClick={handleGoogleLogin}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded"
                >
                    Войти через Google
                </button>

                {/* Email регистрация / вход */}
                <div className="border p-4 rounded w-80 bg-white shadow">
                    <h2 className="text-lg font-bold mb-2">
                        {isLoginMode ? 'Вход по Email' : 'Регистрация'}
                    </h2>
                    <form onSubmit={handleEmailAuth} className="flex flex-col gap-2">
                        <input
                            type="email"
                            placeholder="Email"
                            className="border rounded p-2"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Пароль"
                            className="border rounded p-2"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            {isLoginMode ? 'Войти' : 'Зарегистрироваться'}
                        </button>
                    </form>
                    <p className="text-sm mt-2">
                        {isLoginMode ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
                        <button
                            onClick={() => setIsLoginMode(!isLoginMode)}
                            className="text-blue-500 underline"
                        >
                            {isLoginMode ? 'Регистрация' : 'Вход'}
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    // Если пользователь вошёл
    return (
        <div className="flex flex-col items-center py-6 px-2 h-[100dvh]">
            <div className="flex justify-between items-center w-full sm:w-80 mb-4">
                <div className="flex items-center gap-2">
                    {user.photoURL && (
                        <img
                            src={user.photoURL}
                            alt="avatar"
                            className="w-8 h-8 rounded-full"
                        />
                    )}
                    <span>{user.displayName || user.email}</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-gray-300 px-2 py-1 rounded text-sm"
                >
                    Выйти
                </button>
            </div>

            <div className="w-full sm:w-1/2 h-[90%] flex flex-col justify-between">

                {/* Список сообщений */}
                <div ref={listRef} className="border rounded p-4 bg-gray-50 h-full overflow-y-auto">
                    {messages.map((msg) => {
                        const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : null;
                        const dateKey = date ? date.toDateString() : null;

                        const showDateHeader = dateKey !== lastDate;
                        if (dateKey) lastDate = dateKey;
                        const isMine = msg.uid === user.uid;
                        return (
                            <div
                                key={msg.id}
                                className={`mb-2 p-2 rounded shadow flex flex-col ${isMine ? 'bg-blue-100' : 'bg-white'}`}
                            >
                                {showDateHeader && date && (
                                    <div className="flex justify-center my-4">
                                        <div
                                            className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full shadow-sm">
                                            {formatDateHeader(date)}
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {msg.photo && (
                                            <img
                                                src={msg.photo}
                                                alt="avatar"
                                                className="w-6 h-6 rounded-full"
                                            />
                                        )}
                                        <div className="text-sm font-bold">{msg.name}</div>
                                    </div>

                                    {/* 🕒 Время сообщения */}
                                    {msg.createdAt?.toDate && (() => {
                                        const date = msg.createdAt.toDate();
                                        const now = new Date();

                                        const isToday =
                                            date.getDate() === now.getDate() &&
                                            date.getMonth() === now.getMonth() &&
                                            date.getFullYear() === now.getFullYear();

                                        return (
                                            <div className="text-xs text-gray-500">
                                                {isToday
                                                    ? date.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : date.toLocaleDateString([], {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric'
                                                    }) +
                                                    ', ' +
                                                    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Режим редактирования */}
                                {editingId === msg.id ? (
                                    <div className="flex gap-2 mt-2">
                                        <input
                                            type="text"
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value)}
                                            className="border rounded p-1 flex-grow"
                                        />
                                        <button
                                            onClick={() => handleEditSave(msg.id)}
                                            // className="bg-green-500 text-white px-2 rounded"
                                        >
                                            ✅
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            // className="bg-gray-400 text-white px-2 rounded"
                                        >
                                            ❌
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-1">{msg.text}</div>
                                )}

                                {/* Кнопки управления только для своих */}
                                {isMine && editingId !== msg.id && (
                                    <div className="flex gap-2 mt-1 text-sm">
                                        <button
                                            onClick={() => {
                                                setEditingId(msg.id);
                                                setEditingText(msg.text);
                                            }}
                                            className="text-blue-500"
                                        >
                                            Редактировать
                                        </button>
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            className="text-red-500"
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                )}
                            </div>

                        );
                    })}
                </div>
                {/* Форма отправки */}
                <form onSubmit={handleSubmit} className="flex gap-2 mt-4 w-full">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="border rounded p-2 w-full"
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 rounded"
                    >
                        &rarr;
                    </button>
                </form>
            </div>
        </div>
    );
}
