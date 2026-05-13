import './config';
import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const auth = getAuth(getApp());
auth.languageCode = 'fr';
