const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyA8WB8OxGPfsjjC7lFOaP2EWLKHoI8Hf5Q",
  authDomain: "rag-file-project.firebaseapp.com",
  projectId: "rag-file-project",
  storageBucket: "rag-file-project.firebasestorage.app",
  messagingSenderId: "692572680233",
  appId: "1:692572680233:web:80e6c59d89d9acc5d9ec38",
  measurementId: "G-LY2WK5SMFE"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  where
};
