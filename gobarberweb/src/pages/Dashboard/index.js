import React from 'react';
import api from '~/services/api';

export default function index() {
  api.get('appointments');
  return <h1>Dashboard</h1>;
}
