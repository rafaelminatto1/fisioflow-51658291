/**
 * usePatientExams - Migrated to Firebase
 *
 * Migration from Supabase to Firebase:
 * - supabase.from('patient_exams') → Firestore collection 'patient_exams'
 * - supabase.from('patient_exam_files') → Firestore collection 'patient_exam_files'
 * - supabase.storage.from('patient-exams') → Firebase Storage 'patient-exams'
 * - Joins replaced with separate queries
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/app';
import { getStorage, ref, uploadBytes, deleteObject } from 'firebase/storage';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

const storage = getStorage();

export interface ExamFile {
  id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface PatientExam {
  id: string;
  patient_id: string;
  title: string;
  exam_date: string | null;
  exam_type: string | null;
  description: string | null;
  created_at: string;
  files?: ExamFile[];
}

export const usePatientExams = (patientId?: string | null) => {
  const [exams, setExams] = useState<PatientExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const fetchExams = useCallback(async () => {
    if (!patientId || !organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'patient_exams'),
        where('patient_id', '==', patientId),
        where('organization_id', '==', organizationId),
        orderBy('exam_date', 'desc')
      );

      const snapshot = await getDocs(q);
      const examsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PatientExam[];

      // Fetch files for each exam
      const examsWithFiles = await Promise.all(
        examsData.map(async (exam) => {
          const filesQuery = query(
            collection(db, 'patient_exam_files'),
            where('exam_id', '==', exam.id)
          );
          const filesSnap = await getDocs(filesQuery);
          const files = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ExamFile[];
          return { ...exam, files };
        })
      );

      setExams(examsWithFiles);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, organizationId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const addExam = async (
    data: { title: string; date: Date; type: string; description: string },
    files: File[]
  ) => {
    if (!patientId || !organizationId) return false;

    try {
      // 1. Create exam
      const examData = {
        patient_id: patientId,
        organization_id: organizationId,
        title: data.title,
        exam_date: data.date.toISOString(),
        exam_type: data.type,
        description: data.description,
        created_at: new Date().toISOString(),
      };

      const examRef = await addDoc(collection(db, 'patient_exams'), examData);
      const examId = examRef.id;

      // 2. Upload files
      if (files.length > 0) {
        const fileUploads = files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${examId}/${crypto.randomUUID()}.${fileExt}`;
          const storageRef = ref(storage, `patient-exams/${fileName}`);

          await uploadBytes(storageRef, file);

          return {
            exam_id: examId,
            organization_id: organizationId,
            file_path: fileName,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            created_at: new Date().toISOString(),
          };
        });

        const uploadedFilesData = await Promise.all(fileUploads);

        // Insert file records
        await Promise.all(
          uploadedFilesData.map(fileData => addDoc(collection(db, 'patient_exam_files'), fileData))
        );
      }

      toast.success('Exame salvo com sucesso');
      fetchExams();
      return true;
    } catch (error) {
      console.error('Error adding exam:', error);
      toast.error('Erro ao salvar exame');
      return false;
    }
  };

  const deleteExam = async (examId: string) => {
    if (!organizationId) return;

    try {
      // Get files to delete from storage
      const filesQuery = query(
        collection(db, 'patient_exam_files'),
        where('exam_id', '==', examId)
      );
      const filesSnap = await getDocs(filesQuery);

      if (!filesSnap.empty) {
        // Delete files from Firebase Storage
        await Promise.all(
          filesSnap.docs.map(async (docSnap) => {
            const filePath = docSnap.data().file_path;
            const storageRef = ref(storage, `patient-exams/${filePath}`);
            await deleteObject(storageRef);
          })
        );

        // Delete file records from Firestore
        await Promise.all(
          filesSnap.docs.map(docSnap => deleteDoc(docSnap.ref))
        );
      }

      // Delete exam record
      await deleteDoc(doc(db, 'patient_exams', examId));

      toast.success('Exame removido');
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Erro ao remover exame');
    }
  }

  return { exams, isLoading, addExam, deleteExam };
};
