import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { LabReportData } from '@/types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logoContainer: {
    width: '50%',
  },
  logo: {
    width: 80,
    height: 80,
  },
  headerRight: {
    width: '50%',
    textAlign: 'right',
    fontSize: 9,
  },
  labName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerDivider: {
    borderBottom: '1pt solid #000',
    marginVertical: 8,
  },
  reportTitle: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    marginVertical: 10,
    letterSpacing: 2,
  },
  patientInfoSection: {
    marginVertical: 8,
  },
  patientInfoRow: {
    flexDirection: 'row',
    marginBottom: 3,
    fontSize: 9,
  },
  patientInfoLeft: {
    width: '50%',
    flexDirection: 'row',
  },
  patientInfoRight: {
    width: '50%',
    flexDirection: 'row',
  },
  infoLabel: {
    width: '35%',
    fontWeight: 'bold',
  },
  infoValue: {
    width: '65%',
  },
  testSection: {
    marginTop: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  table: {
    width: '100%',
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    borderTop: '1pt solid #000',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #ccc',
    minHeight: 20,
  },
  tableColTest: {
    width: '50%',
    padding: 5,
    borderRight: '0.5pt solid #ccc',
  },
  tableColResult: {
    width: '25%',
    padding: 5,
    textAlign: 'center',
    borderRight: '0.5pt solid #ccc',
  },
  tableColNormal: {
    width: '25%',
    padding: 5,
    textAlign: 'center',
  },
  lipidProfileSection: {
    marginTop: 15,
  },
  lipidTitle: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
    textDecoration: 'underline',
  },
  lipidTable: {
    width: '100%',
  },
  lipidTableHeader: {
    flexDirection: 'row',
    borderBottom: '1pt solid #000',
    borderTop: '1pt solid #000',
    fontWeight: 'bold',
    fontSize: 9,
    paddingVertical: 3,
  },
  lipidTableRow: {
    flexDirection: 'row',
    borderBottom: '0.5pt solid #ccc',
    minHeight: 18,
  },
  lipidColTest: {
    width: '50%',
    padding: 4,
  },
  lipidColResult: {
    width: '25%',
    padding: 4,
    textAlign: 'right',
    paddingRight: 20,
  },
  lipidColNormal: {
    width: '25%',
    padding: 4,
    textAlign: 'right',
    paddingRight: 10,
  },
  footerDivider: {
    borderTop: '1pt solid #000',
    marginTop: 40,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontSize: 9,
  },
  footerLeft: {
    width: '45%',
  },
  footerRight: {
    width: '45%',
    textAlign: 'right',
  },
  signature: {
    marginTop: 5,
    fontWeight: 'bold',
  },
  contactInfo: {
    marginTop: 20,
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
  },
  disclaimer: {
    marginTop: 5,
    fontSize: 7,
    textAlign: 'center',
    color: '#888',
    fontStyle: 'italic',
  },
});

interface LabReportPDFProps {
  data: LabReportData;
}

const LabReportPDF: React.FC<LabReportPDFProps> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          {data.logoSrc && <Image style={styles.logo} src={data.logoSrc} />}
          {!data.logoSrc && (
            <View style={{ width: 80, height: 80, border: '1pt solid #ccc' }}>
              <Text style={{ fontSize: 8, padding: 5 }}>LOGO</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.labName}>{data.labName}</Text>
          <Text>{data.labAddress}</Text>
        </View>
      </View>

      <View style={styles.headerDivider} />

      {/* Report Title */}
      <Text style={styles.reportTitle}>LABORATORY REPORT</Text>

      {/* Patient Information */}
      <View style={styles.patientInfoSection}>
        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoLeft}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>: {data.patientName}</Text>
          </View>
          <View style={styles.patientInfoRight}>
            <Text style={styles.infoLabel}>Bill No</Text>
            <Text style={styles.infoValue}>: {data.billNo}</Text>
          </View>
        </View>

        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoLeft}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>: {data.age}</Text>
          </View>
          <View style={styles.patientInfoRight}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>: {data.date}</Text>
          </View>
        </View>

        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoLeft}>
            <Text style={styles.infoLabel}>Sex</Text>
            <Text style={styles.infoValue}>: {data.gender}</Text>
          </View>
          <View style={styles.patientInfoRight}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>: {data.time}</Text>
          </View>
        </View>

        <View style={styles.patientInfoRow}>
          <View style={styles.patientInfoLeft}>
            <Text style={styles.infoLabel}>Ref. By</Text>
            <Text style={styles.infoValue}>: {data.referredBy}</Text>
          </View>
        </View>
      </View>

      <View style={styles.headerDivider} />

      {/* Random Blood Sugar Section */}
      <View style={styles.testSection}>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableColTest}>TEST</Text>
            <Text style={styles.tableColResult}>RESULT</Text>
            <Text style={styles.tableColNormal}>NORMAL VALUE</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableColTest}>RANDOM BLOOD SUGAR</Text>
            <Text style={styles.tableColResult}>{data.rbs}</Text>
            <Text style={styles.tableColNormal}>
              {data.rbsNormalRange || '(80 - 140 mg/dl)'}
            </Text>
          </View>
        </View>
      </View>

      {/* Lipid Profile Section */}
      <View style={styles.lipidProfileSection}>
        <Text style={styles.lipidTitle}>LIPID PROFILE</Text>
        <View style={styles.lipidTable}>
          <View style={styles.lipidTableHeader}>
            <Text style={styles.lipidColTest}>TESTS</Text>
            <Text style={styles.lipidColResult}>RESULT</Text>
            <Text style={styles.lipidColNormal}>NORMAL VALUES</Text>
          </View>

          <View style={styles.lipidTableRow}>
            <Text style={styles.lipidColTest}>Total Cholesterol</Text>
            <Text style={styles.lipidColResult}>{data.totalCholesterol}</Text>
            <Text style={styles.lipidColNormal}>140 - 250    mg/dl</Text>
          </View>

          <View style={styles.lipidTableRow}>
            <Text style={styles.lipidColTest}>HDL Cholesterol</Text>
            <Text style={styles.lipidColResult}>{data.hdl}</Text>
            <Text style={styles.lipidColNormal}>
              M: 30 - 65    mg/dl{'\n'}F: 35 - 80    mg/dl
            </Text>
          </View>

          <View style={styles.lipidTableRow}>
            <Text style={styles.lipidColTest}>LDL Cholesterol</Text>
            <Text style={styles.lipidColResult}>{data.ldl}</Text>
            <Text style={styles.lipidColNormal}>80 - 120    mg/dl</Text>
          </View>

          <View style={styles.lipidTableRow}>
            <Text style={styles.lipidColTest}>VLDL Cholesterol</Text>
            <Text style={styles.lipidColResult}>{data.vldl}</Text>
            <Text style={styles.lipidColNormal}>5 - 40      mg/dl</Text>
          </View>

          <View style={styles.lipidTableRow}>
            <Text style={styles.lipidColTest}>Triglyceride</Text>
            <Text style={styles.lipidColResult}>{data.triglycerides}</Text>
            <Text style={styles.lipidColNormal}>65 - 165    mg/dl</Text>
          </View>
        </View>
      </View>

      {/* Footer Section */}
      <View style={styles.footerDivider} />
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text>Lab. Technician</Text>
          <Text style={styles.signature}>{data.technician}</Text>
        </View>
        <View style={styles.footerRight}>
          <Text>{data.consultantBiochemist}</Text>
          <Text style={styles.signature}>Consultant Biochemist</Text>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.contactInfo}>
        <Text>Email: {data.labEmail}</Text>
        <Text>Phone: {data.labPhone}</Text>
        <Text>Timings: 6:30 a.m. to 7:30 p.m., Sunday: 6:30 a.m. to 1:00 p.m.</Text>
      </View>

      <View style={styles.disclaimer}>
        <Text>
          COMPUTERIZED CLINICAL LAB, USG SCAN & DOPPLER STUDIES, ECG, HEALTH PKG, HORMONE TESTS LIKE THYROID, CANCER MARKERS ETC.
        </Text>
      </View>
    </Page>
  </Document>
);

export default LabReportPDF;
