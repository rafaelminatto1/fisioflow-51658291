/**
 * useMedicalRequests - Migrated to Firebase
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query as firestoreQuery, where, getDocs, addDoc, deleteDoc, doc, orderBy, getDoc,  } from '@/integrations/firebase/app';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { db, getFirebaseStorage } from '@/integrations/firebase/app';

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { fisioLogger as logger } from '@/lib/errors/logger';

// Helper to convert doc
const convertDoc = (doc: { id: string; data: () => Record<string, unknown> }) => ({ id: doc.id, ...doc.data() });

export interface MedicalRequestFile {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface MedicalRequest {
  id: string;
  patient_id: string;
  doctor_name: string | null;
  request_date: string | null;
  notes: string | null;
  created_at: string;
  files?: MedicalRequestFile[];
}

export const useMedicalRequests = (patientId?: string | null) => {
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const fetchRequests = useCallback(async () => {
    if (!patientId || !organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      const q = firestoreQuery(
        collection(db, 'medical_requests'),
        where('patient_id', '==', patientId),
        where('organization_id', '==', organizationId),
        orderBy('request_date', 'desc')
      );

      const snapshot = await getDocs(q);
      const requestsData = await Promise.all(
        snapshot.docs.map(async (requestDoc) => {
          const requestData = convertDoc(requestDoc);

          // Fetch files for this request
          const filesQ = firestoreQuery(
            collection(db, 'medical_request_files'),
            where('medical_request_id', '==', requestDoc.id)
          );
          const filesSnap = await getDocs(filesQ);
          const files = filesSnap.docs.map(convertDoc);

          return { ...requestData, files };
        })
      );

      setRequests(requestsData || []);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, organizationId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const addRequest = async (
    data: { doctorName: string; date: Date; notes: string },
    files: File[]
  ) => {
    if (!patientId || !organizationId) return false;

    try {
      // 1. Create request
      const requestRef = await addDoc(collection(db, 'medical_requests'), {
        patient_id: patientId,
        organization_id: organizationId,
        doctor_name: data.doctorName,
        request_date: data.date.toISOString(),
        notes: data.notes,
        created_at: new Date().toISOString()
      });

      const requestData = { id: requestRef.id };

      // 2. Upload files
      if (files.length > 0) {
        const storage = getFirebaseStorage();

        const fileUploads = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${requestData.id}/${crypto.randomUUID()}.${fileExt}`;
          const storageRef = ref(storage, `medical-requests/${fileName}`);

          await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(storageRef);

          return {
            medical_request_id: requestData.id,
            organization_id: organizationId,
            file_path: fileName,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            download_url: downloadUrl
          };
        });

        const uploadedFilesData = await Promise.all(fileUploads);

        // Insert file records
        await Promise.all(
          uploadedFilesData.map(fileData =>
            addDoc(collection(db, 'medical_request_files'), fileData)
          )
        );
      }

      toast.success('Pedido médico salvo com sucesso');
      fetchRequests();
      return true;
    } catch (error) {
      logger.error('Error adding medical request', error, 'useMedicalRequests');
      toast.error('Erro ao salvar pedido médico');
      return false;
    }
  };

  const deleteRequest = async (requestId: string) => {
    if (!organizationId) return;

    try {
      // Get files to delete from storage
      const filesQ = firestoreQuery(
        collection(db, 'medical_request_files'),
        where('medical_request_id', '==', requestId)
      );
      const filesSnap = await getDocs(filesQ);

      if (!filesSnap.empty) {
        const storage = getFirebaseStorage();

        // Delete files from storage
        await Promise.all(
          filesSnap.docs.map(async (fileDoc) => {
            const fileData = convertDoc(fileDoc);
            const storageRef = ref(storage, `medical-requests/${fileData.file_path}`);
            await deleteObject(storageRef);
          })
        );

        // Delete file records
        await Promise.all(
          filesSnap.docs.map(fileDoc =>
            deleteDoc(doc(db, 'medical_request_files', fileDoc.id))
          )
        );
      }

      // Delete request
      await deleteDoc(doc(db, 'medical_requests', requestId));

      toast.success('Pedido removido');
      fetchRequests();
    } catch (error) {
      logger.error('Error deleting request', error, 'useMedicalRequests');
      toast.error('Erro ao remover pedido');
    }
  };

  return { requests, isLoading, addRequest, deleteRequest };
};
