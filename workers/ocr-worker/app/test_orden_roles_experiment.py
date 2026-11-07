import unittest
from app.extractors.orden_extractor import extract_orden_comprador_ruc as buyer, extract_orden_proveedor_ruc as supplier
class RolesSynthetic(unittest.TestCase):
    def test_bbtec_synthetic(self):
        text="ORDEN DE COMPRA OC003489\nCOMPRADOR BBTEC RUC: 20299922821\nPROVEEDOR SINTETICO RUC: 20519022461"
        self.assertEqual(buyer(text),'20299922821');self.assertEqual(supplier(text),'20519022461')
    def test_order_independent(self):
        text="PROVEEDOR RUC: 20519022461\nCOMPRADOR RUC: 20299922821"
        self.assertEqual(buyer(text),'20299922821');self.assertEqual(supplier(text),'20519022461')
    def test_legacy_bbti(self):
        text="BBTI S.A.C. R.U.C. 20565747356\nR.U.C. 20519022461"
        self.assertEqual(buyer(text),'20565747356');self.assertEqual(supplier(text),'20519022461')
    def test_ambiguous_unlabelled(self):
        self.assertIsNone(supplier('20299922821 20519022461'));self.assertIsNone(buyer('20299922821 20519022461'))
    def test_conflicting_labels(self):
        text='COMPRADOR RUC: 20299922821\nPROVEEDOR RUC: 20299922821'
        self.assertIsNone(buyer(text));self.assertIsNone(supplier(text))
    def test_multiple_buyers(self):
        self.assertIsNone(buyer('COMPRADOR RUC: 20299922821\nCOMPRADOR RUC: 20565747356'))
    def test_tenant_order_has_no_global_state(self):
        bbtec='COMPRADOR RUC: 20299922821\nPROVEEDOR RUC: 20519022461'
        bbti='BBTI RUC 20565747356\nRUC 20519022461'
        self.assertEqual(buyer(bbtec),'20299922821');self.assertEqual(buyer(bbti),'20565747356');self.assertEqual(buyer(bbtec),'20299922821')
    def test_single_supplier_legacy(self):self.assertEqual(supplier('RUC 20519022461'),'20519022461')
# The following fixture is an abbreviated transcription of the OCR text supplied by PO,
# not a new OCR execution or a complete PDF reconstruction.
class HeaderLayoutRoles(unittest.TestCase):
    def fixture(self, tipo='COMPRA'):
        return ('SEÑOR(ES) : PLACA MASS E.I.R.L.\n02/11/2026\nFECHA :\n'
                f'Orden de {tipo} Nº:003490\nBB TECNOLOGIA INDUSTRIAL S.A.C.\n'
                'DIRECCION SINTETICA\n20299922821\nR.U.C.  \nTELEFONO :\nATENCIÓN :\n20522718786')
    def test_po_oc003490_excerpt(self):
        self.assertEqual(buyer(self.fixture()),'20299922821');self.assertEqual(supplier(self.fixture()),'20522718786')
    def test_os_same_document_layout(self):
        self.assertEqual(buyer(self.fixture('SERVICIO')),'20299922821');self.assertEqual(supplier(self.fixture('SERVICIO')),'20522718786')
    def test_not_tied_to_company_or_authenticated_tax_id(self):
        text=self.fixture().replace('BB TECNOLOGIA INDUSTRIAL S.A.C.','COMPRADOR SINTETICO').replace('20299922821','20100070970')
        self.assertEqual(buyer(text),'20100070970');self.assertEqual(supplier(text),'20522718786')
    def test_extra_ruc_requires_explicit_roles(self):
        text=self.fixture()+'\n20100070970'
        self.assertIsNone(buyer(text));self.assertIsNone(supplier(text))
    def test_missing_layout_evidence_does_not_guess(self):
        text=self.fixture().replace('ATENCIÓN :','').replace('TELEFONO :','')
        self.assertIsNone(buyer(text));self.assertIsNone(supplier(text))
    def test_bbti_legacy_regression_supplier_first(self):
        text='R.U.C. 20522718786\nBBTI S.A.C. R.U.C. 20565747356'
        self.assertEqual(buyer(text),'20565747356');self.assertEqual(supplier(text),'20522718786')
if __name__=='__main__':unittest.main()
