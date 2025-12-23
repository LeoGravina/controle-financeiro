// src/services/transactionService.js
import { 
    addDoc, 
    collection, 
    doc, 
    updateDoc, 
    deleteDoc, 
    writeBatch, 
    query, 
    where, 
    getDocs,
    Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { addMonths } from 'date-fns';

// --- CRIAR ---

export const createTransaction = async (userId, transactionData) => {
    // Garante que a data seja Timestamp antes de enviar
    const dataToSave = {
        ...transactionData,
        userId,
        date: Timestamp.fromDate(transactionData.date),
        createdAt: Timestamp.now()
    };
    return await addDoc(collection(db, 'transactions'), dataToSave);
};

export const createInstallmentTransaction = async (userId, transactionData) => {
    const batch = writeBatch(db);
    const groupId = doc(collection(db, 'transactions')).id; // ID para agrupar as parcelas
    
    // Extrai dados e remove propriedades que não vão para o banco individualmente
    const { amount, installments, date, description, ...rest } = transactionData;
    
    const installmentAmount = amount / installments;

    for (let i = 0; i < installments; i++) {
        const newTransactionRef = doc(collection(db, 'transactions'));
        
        // Calcula a data correta para os próximos meses
        const installmentDate = addMonths(date, i);

        batch.set(newTransactionRef, {
            ...rest,
            userId,
            description: `${description} (${i + 1}/${installments})`,
            amount: installmentAmount,
            totalAmount: amount, // Valor total da compra original
            installments: installments,
            installmentGroupId: groupId,
            date: Timestamp.fromDate(installmentDate),
            isPaid: false, // Parcelas futuras começam como não pagas (geralmente)
            isInstallment: true,
            createdAt: Timestamp.now()
        });
    }

    await batch.commit();
};

// --- ATUALIZAR ---

export const updateTransaction = async (id, updates) => {
    const dataToUpdate = { ...updates };
    
    // Converte Date JS para Timestamp se necessário
    if (dataToUpdate.date && dataToUpdate.date instanceof Date) {
        dataToUpdate.date = Timestamp.fromDate(dataToUpdate.date);
    }
    
    // Removemos campos que não devem ser salvos se vierem por engano
    delete dataToUpdate.id; 

    return await updateDoc(doc(db, 'transactions', id), dataToUpdate);
};

export const updateInstallmentGroup = async (userId, groupId, updatedData) => {
    // Para edição de parcelas, a estratégia mais segura é deletar e recriar, 
    // mas aqui faremos uma atualização em lote simples (ex: mudar categoria de todas)
    const batch = writeBatch(db);
    const q = query(
        collection(db, 'transactions'), 
        where('userId', '==', userId), 
        where('installmentGroupId', '==', groupId)
    );
    
    const snapshot = await getDocs(q);
    
    // Prepara dados
    const dataToUpdate = { ...updatedData };
    if (dataToUpdate.date) delete dataToUpdate.date; // Não mudamos data em lote aqui para não quebrar a ordem dos meses
    delete dataToUpdate.id;
    delete dataToUpdate.amount; // Evita mudar valor em lote sem recalcular

    snapshot.forEach((doc) => {
        batch.update(doc.ref, dataToUpdate);
    });

    await batch.commit();
};

export const toggleTransactionPaid = async (id, currentStatus) => {
    return await updateDoc(doc(db, 'transactions', id), { isPaid: !currentStatus });
};

// --- DELETAR ---

export const deleteTransaction = async (id) => {
    return await deleteDoc(doc(db, 'transactions', id));
};

export const deleteInstallmentGroup = async (userId, groupId) => {
    const batch = writeBatch(db);
    const q = query(
        collection(db, 'transactions'), 
        where('userId', '==', userId), 
        where('installmentGroupId', '==', groupId)
    );
    
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();
};