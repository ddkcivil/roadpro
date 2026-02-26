import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}

const QRCodeGenerator: React.FC<QRCodeProps> = ({ 
  value, 
  size = 128, 
  bgColor = '#ffffff', 
  fgColor = '#000000', 
  level = 'M' 
}) => {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      level={level}
    />
  );
};

export default QRCodeGenerator;
