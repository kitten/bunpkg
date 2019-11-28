import mime from 'mime/lite';

mime.define(
  {
    'text/plain': [
      'authors',
      'changes',
      'license',
      'makefile',
      'patents',
      'readme',
      'ts',
      'flow'
    ]
  },
  /* force */ true
);

const textFiles = /\/?(\.[a-z]*rc|\.git[a-z]*|\.[a-z]*ignore|\.lock)$/i;

export const getContentType = (fileName: string): string =>
  textFiles.test(fileName)
    ? 'text/plain'
    : mime.getType(fileName) || 'text/plain';
